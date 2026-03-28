from flask import Blueprint, request, jsonify
from services.chat_service import chat_completion, get_history, clear_history, add_context

chat_bp = Blueprint('chat', __name__)


@chat_bp.route('', methods=['POST'])
def chat():
    """Send message to AI"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No request data'}), 400

    message = data.get('message', '')
    user_id = data.get('userId', 'default')
    slide_id = data.get('slideId')
    selected_cards = data.get('selectedCards', [])

    if not message:
        return jsonify({'error': 'Empty message'}), 400

    result = chat_completion(
        message=message,
        user_id=user_id,
        slide_id=slide_id,
        selected_cards=selected_cards
    )

    return jsonify(result)


@chat_bp.route('/context', methods=['POST'])
def add_context_message():
    """Add context message to chat history (e.g., file analysis result)"""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No request data'}), 400

    user_id = data.get('userId', 'default')
    role = data.get('role', 'assistant')
    content = data.get('content', '')

    if not content:
        return jsonify({'error': 'Empty content'}), 400

    add_context(user_id, role, content)
    return jsonify({'status': 'ok'})


@chat_bp.route('/history', methods=['GET'])
def get_chat_history():
    """Get chat history"""
    user_id = request.args.get('userId', 'default')
    history = get_history(user_id)
    return jsonify(history)


@chat_bp.route('/history', methods=['DELETE'])
def delete_chat_history():
    """Clear chat history"""
    user_id = request.args.get('userId', 'default')
    clear_history(user_id)
    return jsonify({'status': 'ok'})
