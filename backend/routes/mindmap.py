from flask import Blueprint, request, jsonify
from services.mindmap_service import (
    get_all_mindmaps,
    get_mindmap,
    save_mindmap,
    delete_mindmap,
    create_empty_mindmap,
    concept_associate
)

mindmap_bp = Blueprint('mindmap', __name__)

# 存储待生成的节点，用于异步节点生成
# task_id -> {'nodes': [], 'edges': [], 'done': False, 'status': 'running'}
PENDING_NODES = {}


@mindmap_bp.route('', methods=['GET'])
def list_mindmaps():
    """List all mindmaps"""
    mindmaps = get_all_mindmaps()
    return jsonify(mindmaps)


@mindmap_bp.route('', methods=['POST'])
def create_mindmap():
    """Create a new mindmap"""
    data = request.get_json() or {}
    title = data.get('title', 'Untitled Mind Map')

    if data:
        # If data provided, save it directly
        mindmap_data = save_mindmap(data)
    else:
        # Otherwise create empty with default root node
        mindmap_data = create_empty_mindmap(title)

    return jsonify(mindmap_data), 201


@mindmap_bp.route('/<mindmap_id>', methods=['GET'])
def get_mindmap_by_id(mindmap_id):
    """Get a specific mindmap"""
    mindmap_data = get_mindmap(mindmap_id)
    if not mindmap_data:
        return jsonify({'error': 'Mindmap not found'}), 404
    return jsonify(mindmap_data)


@mindmap_bp.route('/<mindmap_id>', methods=['PUT'])
def update_mindmap(mindmap_id):
    """Update a mindmap"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Ensure ID matches
    data['id'] = mindmap_id
    mindmap_data = save_mindmap(data)
    return jsonify(mindmap_data)


@mindmap_bp.route('/<mindmap_id>', methods=['DELETE'])
def delete_mindmap_by_id(mindmap_id):
    """Delete a mindmap"""
    success = delete_mindmap(mindmap_id)
    if not success:
        return jsonify({'error': 'Mindmap not found'}), 404
    return jsonify({'status': 'ok'})


@mindmap_bp.route('/generate-node', methods=['POST'])
def generate_node():
    """接收并存储生成的节点（异步模式）

    Request body:
    {
        "task_id": "任务ID",
        "node": { "id": "...", "text": "...", "position": {...} },
        "edge": { "id": "...", "from": "...", "to": "..." }  // 可选
    }
    """
    data = request.get_json() or {}
    task_id = data.get('task_id')
    node = data.get('node')
    edge = data.get('edge')

    if not task_id:
        return jsonify({'error': 'task_id is required'}), 400
    if not node:
        return jsonify({'error': 'node is required'}), 400

    if task_id not in PENDING_NODES:
        PENDING_NODES[task_id] = {
            'nodes': [],
            'edges': [],
            'done': False,
            'status': 'running'
        }

    PENDING_NODES[task_id]['nodes'].append(node)
    if edge:
        PENDING_NODES[task_id]['edges'].append(edge)
        print(f"[联想] 生成节点: {node.get('id', 'unknown')}, 边: {edge.get('from')} -> {edge.get('to')}")
    else:
        print(f"[联想] 生成节点: {node.get('id', 'unknown')}, 无边")
    return jsonify({'status': 'ok', 'node_id': node.get('id')})


@mindmap_bp.route('/associate/complete', methods=['POST'])
def complete_associate():
    """标记联想任务完成

    Request body:
    {
        "task_id": "任务ID"
    }
    """
    data = request.get_json() or {}
    task_id = data.get('task_id')

    if task_id in PENDING_NODES:
        PENDING_NODES[task_id]['done'] = True
        PENDING_NODES[task_id]['status'] = 'completed'
        print(f"[联想] 任务 {task_id} 完成")
        return jsonify({'status': 'ok'})
    return jsonify({'error': 'Task not found'}), 404


@mindmap_bp.route('/associate/poll/<task_id>', methods=['GET'])
def poll_associate(task_id):
    """轮询联想任务状态，返回新生成的节点和边"""
    task = PENDING_NODES.get(task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404

    return jsonify({
        'status': task['status'],
        'done': task['done'],
        'nodes': task['nodes'],
        'edges': task['edges']
    })


@mindmap_bp.route('/associate', methods=['POST'])
def associate_concepts():
    """开始异步概念联想任务

    Request body:
    {
        "text": "输入文本",
        "max_iter": 2,
        "max_word": 3,
        "base_position": {"x": 400, "y": 300}
    }

    Returns: 任务ID，前端通过 /associate/poll/<task_id> 轮询结果
    """
    import uuid
    import threading
    import requests

    data = request.get_json() or {}
    text = data.get('text', '')
    max_iter = data.get('max_iter', 2)
    max_word = data.get('max_word', 3)
    base_position = data.get('base_position', {"x": 400, "y": 300})
    nodeId = data.get('nodeId')  # 源节点ID

    if not text:
        return jsonify({'error': 'Text is required'}), 400

    # 生成任务ID
    task_id = str(uuid.uuid4())

    # 获取服务器地址（在主线程中获取，避免线程中无法访问request）
    base_url = request.host_url.rstrip('/')

    # 初始化任务状态
    PENDING_NODES[task_id] = {
        'nodes': [],
        'edges': [],
        'done': False,
        'status': 'running'
    }

    def run_association():
        """在新线程中运行联想任务，每生成一个节点就发送请求"""
        try:
            print(f"[联想] 任务 {task_id} 开始")

            for event in concept_associate(text, max_iter, max_word, base_position, nodeId):
                if event['type'] == 'node':
                    node = event['data']
                    edge = event.get('edge')  # 可能存在edge信息

                    # 发送请求到 generate-node 路由
                    requests.post(
                        f"{base_url}/api/mindmaps/generate-node",
                        json={"task_id": task_id, "node": node, "edge": edge},
                        timeout=5
                    )
                elif event['type'] == 'edge':
                    # 直接存储边
                    PENDING_NODES[task_id]['edges'].append(event['data'])
                elif event['type'] == 'done':
                    PENDING_NODES[task_id]['done'] = True
                    PENDING_NODES[task_id]['status'] = 'completed'
                    print(f"[联想] 任务 {task_id} 完成")
        except Exception as e:
            PENDING_NODES[task_id]['status'] = 'error'
            print(f"[联想] 任务 {task_id} 错误: {e}")

    thread = threading.Thread(target=run_association)
    thread.daemon = True
    thread.start()

    print(f"[联想] 任务 {task_id} 已启动")

    return jsonify({
        'task_id': task_id,
        'status': 'started'
    })
