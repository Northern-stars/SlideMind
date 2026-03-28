# API Calling 模块文档

## 概述

`api_calling.py` 提供与 MiniMax API 交互的功能，支持文件上传、OCR 文字提取、PPT/PDF 文件分析等功能。

---

## 核心类与函数

### 1. `pptx_to_images(pptx_path, dpi=300)`

将 PPTX 文件转换为图片列表。

**参数：**
- `pptx_path`: PPTX 文件路径
- `dpi`: 图片质量（当前版本不支持自定义 DPI）

**返回：** `List[PIL.Image]` - 每页幻灯片对应的图片列表

**示例：**
```python
from api_calling import pptx_to_images

images = pptx_to_images("demo.pptx")
print(f"共 {len(images)} 张幻灯片")
```

---

### 2. `pdf_to_images(pdf_path, dpi=200)`

将 PDF 文件转换为图片列表。

**参数：**
- `pdf_path`: PDF 文件路径
- `dpi`: 图片质量（默认 200）

**返回：** `List[PIL.Image]` - 每页对应的图片列表

**示例：**
```python
from api_calling import pdf_to_images

images = pdf_to_images("demo.pdf", dpi=150)
```

---

### 3. `extract_text_from_pdf(pdf_path)`

从 PDF 文件中直接提取文字内容。

**参数：**
- `pdf_path`: PDF 文件路径

**返回：** `str` - 提取的文本内容

**示例：**
```python
from api_calling import extract_text_from_pdf

text = extract_text_from_pdf("demo.pdf")
print(text[:500])
```

---

### 4. `OCRProcessor`

OCR 处理器，使用 PaddleOCR 识别图片中的文字。

**初始化参数：**
- `lang`: 语言，'ch' 中文，'en' 英文，'ch_sim' 简体中文（默认 'ch'）
- `use_angle_cls`: 是否使用角度分类（默认 True）

**方法：**

#### `extract_text(image_path)`

从单张图片中提取文字。

**参数：**
- `image_path`: 图片路径或 PIL Image 对象

**返回：** `str` - 识别的文字内容

**示例：**
```python
from api_calling import OCRProcessor

ocr = OCRProcessor(lang='ch')
text = ocr.extract_text("screenshot.png")
print(text)
```

#### `extract_text_batch(image_paths)`

批量从多张图片中提取文字。

**参数：**
- `image_paths`: 图片路径列表

**返回：** `list` - 每张图片识别的文字列表

**示例：**
```python
ocr = OCRProcessor()
results = ocr.extract_text_batch(["page1.png", "page2.png"])
```

---

### 5. `get_ocr_processor(lang='ch')`

获取或创建全局 OCR 处理器实例。

**参数：**
- `lang`: 语言（默认 'ch'）

**返回：** `OCRProcessor` 实例

**示例：**
```python
from api_calling import get_ocr_processor

ocr = get_ocr_processor(lang='en')
```

---

### 6. `extract_text_from_image(image_path)`

快捷函数：从单张图片提取文字。

**参数：**
- `image_path`: 图片路径或 PIL Image 对象

**返回：** `str` - 识别的文字内容

**示例：**
```python
from api_calling import extract_text_from_image

text = extract_text_from_image("demo.png")
```

---

### 7. `MCPClient`

MiniMax MCP 文件管理客户端。

**初始化参数：**
- `server_url`: MCP 服务器地址（默认 `https://api.minimaxi.com`）
- `api_key`: API 密钥

**方法：**

#### `upload_file(file_path, purpose="file-extract")`

上传文件到 MCP 服务器。

**示例：**
```python
from api_calling import MCPClient

client = MCPClient(api_key="your-api-key")
result = client.upload_file("document.pdf", purpose="file-extract")
file_id = result.get("file_id")
```

#### `list_files()`

列出已上传的文件。

**示例：**
```python
files = client.list_files()
```

#### `delete_file(file_id)`

删除已上传的文件。

**示例：**
```python
client.delete_file(file_id)
```

---

### 8. `api_access`

MiniMax API 访问类。

**初始化参数：**
- `key`: API 密钥（默认从环境变量 `MINIMAX_API_KEY` 读取）
- `model`: 模型名称（默认 "MiniMax-M2.7"）

**方法：**

#### `read_text(text_list)`

多轮对话接口。

**参数：**
- `text_list`: `[[role, content], ...]` 格式，role 为 'user' 或 'assistant'

**返回：** `str` - AI 响应内容

**示例：**
```python
from api_calling import api_access

api = api_access()

messages = [
    ["user", "什么是机器学习？"],
    ["assistant", "机器学习是人工智能的一个子集..."],
    ["user", "能举个例子吗？"]
]
response = api.read_text(messages)
print(response)
```

#### `chat(message, history=None)`

简单聊天接口。

**参数：**
- `message`: 用户消息
- `history`: 可选的对话历史 `[[role, content], ...]`

**返回：** `str` - AI 响应内容

**示例：**
```python
api = api_access()

# 单轮对话
response = api.chat("你好！")

# 多轮对话
history = [["user", "什么是深度学习？"]]
response = api.chat("它和机器学习有什么区别？", history=history)
```

#### `analyze_pptx_file(pptx_path, prompt="请描述这个PPT文件的内容")`

上传 PPTX 文件进行分析（通过 MCP）。

**参数：**
- `pptx_path`: PPTX 文件路径
- `prompt`: 给模型的提示词

**返回：** `dict` - 包含 file_info 和 response

**示例：**
```python
api = api_access()
result = api.analyze_pptx_file(
    "presentation.pptx",
    prompt="请总结这个PPT的主要内容"
)
print(result['response'])
```

#### `analyze_pdf_file(pdf_path, prompt="请描述这个PDF文件的内容")`

上传 PDF 文件进行分析（通过 MCP）。

**参数：**
- `pdf_path`: PDF 文件路径
- `prompt`: 给模型的提示词

**返回：** `dict` - 包含 file_info 和 response

**示例：**
```python
api = api_access()
result = api.analyze_pdf_file(
    "document.pdf",
    prompt="请提取PDF中的关键信息"
)
print(result['response'])
```

#### `analyze_image_with_ocr(image_path, prompt="请描述这张图片的内容")`

使用 OCR + MiniMax 分析图片。

**参数：**
- `image_path`: 图片路径或 PIL Image 对象
- `prompt`: 给模型的提示词

**返回：** `dict` - 包含 ocr_text（识别的文字）和 response（模型响应）

**示例：**
```python
api = api_access()
result = api.analyze_image_with_ocr(
    "photo.png",
    prompt="请描述这张图片的内容"
)
print(f"识别文字: {result['ocr_text']}")
print(f"模型描述: {result['response']}")
```

#### `analyze_pdf_with_ocr(pdf_path, prompt="请总结这个PDF的内容")`

分析 PDF 文件（通过 pypdf 提取文字后发送给模型）。

**参数：**
- `pdf_path`: PDF 文件路径
- `prompt`: 给模型的提示词

**返回：** `dict` - 包含 pages、full_text 和 summary

**示例：**
```python
api = api_access()
result = api.analyze_pdf_with_ocr(
    "document.pdf",
    prompt="请总结这份文档的核心观点"
)
print(f"文字内容: {result['full_text'][:200]}...")
print(f"总结: {result['summary']}")
```

#### `analyze_pptx_with_ocr(pptx_path, prompt="请总结这个PPT的内容")`

分析 PPTX 文件（转换为图片后 OCR，再发送给模型）。

**参数：**
- `pptx_path`: PPTX 文件路径
- `prompt`: 给模型的提示词

**返回：** `dict` - 包含 slides、full_text 和 summary

**示例：**
```python
api = api_access()
result = api.analyze_pptx_with_ocr(
    "presentation.pptx",
    prompt="请总结这个PPT的主要内容"
)
print(f"幻灯片数量: {len(result['slides'])}")
print(f"总结: {result['summary']}")
```

---

## 完整调用示例

### 示例：分析一份 PDF 文档

```python
from api_calling import api_access, extract_text_from_pdf

# 创建 API 实例
api = api_access()

# 方式1：直接提取 PDF 文字
text = extract_text_from_pdf("document.pdf")
print(f"提取文字长度: {len(text)}")

# 方式2：提取文字并让 AI 总结
result = api.analyze_pdf_with_ocr(
    "document.pdf",
    prompt="请总结这份技术文档的核心内容和关键技术点"
)
print(f"总结: {result['summary']}")
```

### 示例：分析一份 PPT

```python
from api_calling import api_access

api = api_access()

# 分析 PPT 文件
result = api.analyze_pptx_with_ocr(
    "slides.pptx",
    prompt="请按页面顺序总结这个PPT讲述了什么故事"
)

print(f"共 {len(result['slides'])} 张幻灯片")
for slide in result['slides']:
    print(f"第 {slide['slide']} 页文字: {slide['ocr_text'][:50]}...")
```

### 示例：OCR 识别图片中的文字

```python
from api_calling import OCRProcessor

ocr = OCRProcessor(lang='ch')  # 中文识别
text = ocr.extract_text("screenshot.png")
print(f"识别结果: {text}")
```

---

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `MINIMAX_API_KEY` | MiniMax API 密钥 | 空 |
| `MCP_URL` | MCP 服务器地址 | `https://api.minimaxi.com` |
