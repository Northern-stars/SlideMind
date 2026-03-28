"""Test program for api_calling chat functionality"""
import os
from api_calling import api_access, pptx_to_images

# Use default key from api_calling.py (hardcoded)
print("Using API key from api_calling.py")


def test_chat():
    """Test basic chat functionality"""
    print("=" * 50)
    print("Test 1: Basic Chat")
    print("=" * 50)

    api = api_access()  # Uses default key from api_calling.py

    # Simple conversation
    messages = [
        ["user", "Hello, can you introduce yourself?"],
    ]

    try:
        response = api.read_text(messages)
        print(f"Response: {response}")
        print("Test 1: PASSED\n")
    except Exception as e:
        print(f"Test 1: FAILED - {e}\n")


def test_multiturn_chat():
    """Test multi-turn conversation"""
    print("=" * 50)
    print("Test 2: Multi-turn Chat")
    print("=" * 50)

    api = api_access()  # Uses default key from api_calling.py

    # Multi-turn conversation
    messages = [
        ["user", "What is machine learning?"],
        ["assistant", "Machine learning is a subset of artificial intelligence..."],
        ["user", "Can you give me an example?"],
    ]

    try:
        response = api.read_text(messages)
        print(f"Response: {response}")
        print("Test 2: PASSED\n")
    except Exception as e:
        print(f"Test 2: FAILED - {e}\n")


def test_pptx_conversion():
    """Test PPTX to images conversion"""
    print("=" * 50)
    print("Test 3: PPTX to Images Conversion")
    print("=" * 50)

    pptx_path = os.path.join(os.path.dirname(__file__), "uploads", "test.pptx")

    if not os.path.exists(pptx_path):
        print(f"Test file not found: {pptx_path}")
        print("Test 3: SKIPPED\n")
        return

    try:
        images = pptx_to_images(pptx_path)
        print(f"Converted {len(images)} slides to images")
        if images:
            print(f"First image size: {images[0].size}")
        print("Test 3: PASSED\n")
    except Exception as e:
        print(f"Test 3: FAILED - {e}\n")


def test_pptx_image_analysis():
    """Test PPTX file upload analysis with AI model"""
    print("=" * 50)
    print("Test 3b: PPTX File Upload Analysis")
    print("=" * 50)

    pptx_path = os.path.join(os.path.dirname(__file__), "uploads", "test.pptx")

    if not os.path.exists(pptx_path):
        print(f"Test file not found: {pptx_path}")
        print("Test 3b: SKIPPED\n")
        return

    api = api_access()

    try:
        print(f"Analyzing PPTX: {pptx_path}")
        result = api.analyze_pptx_file(pptx_path, prompt="请描述这个PPT文件的内容")

        if "error" in result:
            print(f"Error: {result['error']}")
            print(f"File info: {result.get('file_info')}")
        else:
            print(f"File ID: {result['file_info'].get('file_id')}")
            print(f"Response: {result['response'][:500]}..." if len(result.get('response', '')) > 500 else f"Response: {result.get('response', '')}")

        print("\nTest 3b: PASSED\n")
    except Exception as e:
        print(f"Test 3b: FAILED - {e}\n")


def test_pdf_file_analysis():
    """Test PDF file upload analysis with AI model"""
    print("=" * 50)
    print("Test 6: PDF File Upload Analysis")
    print("=" * 50)

    pdf_path = os.path.join(os.path.dirname(__file__), "uploads", "test.pdf")

    if not os.path.exists(pdf_path):
        print(f"Test file not found: {pdf_path}")
        print("Test 6: SKIPPED\n")
        return

    api = api_access()

    try:
        print(f"Analyzing PDF: {pdf_path}")
        result = api.analyze_pdf_file(pdf_path, prompt="请描述这个PDF文件的内容")

        if "error" in result:
            print(f"Error: {result['error']}")
            print(f"File info: {result.get('file_info')}")
        else:
            print(f"File ID: {result['file_info'].get('file_id')}")
            print(f"Response: {result['response'][:500]}..." if len(result.get('response', '')) > 500 else f"Response: {result.get('response', '')}")

        print("\nTest 6: PASSED\n")
    except Exception as e:
        print(f"Test 6: FAILED - {e}\n")


def test_ocr_image():
    """Test OCR on single image"""
    print("=" * 50)
    print("Test 7: OCR Image Analysis")
    print("=" * 50)

    # Create a test image with text
    from PIL import Image as PILImage
    import io

    img_path = os.path.join(os.path.dirname(__file__), "uploads", "test_ocr.png")

    # Create test image if not exists
    if not os.path.exists(img_path):
        print("Creating test OCR image...")
        # Create image with text
        test_img = PILImage.new('RGB', (400, 100), color='white')
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(test_img)
        draw.text((10, 30), "Hello World! 你好世界！", fill='black')
        test_img.save(img_path)

    api = api_access()

    try:
        print(f"Analyzing image: {img_path}")
        from api_calling import extract_text_from_image
        text = extract_text_from_image(img_path)
        print(f"OCR Text: {text}")

        # Also test full analysis
        result = api.analyze_image_with_ocr(img_path, prompt="请描述这张图片")
        print(f"Response: {result.get('response', '')[:200]}...")

        print("\nTest 7: PASSED\n")
    except Exception as e:
        print(f"Test 7: FAILED - {e}\n")


def test_pdf_with_ocr():
    """Test PDF analysis with OCR"""
    print("=" * 50)
    print("Test 8: PDF OCR Analysis")
    print("=" * 50)

    pdf_path = os.path.join(os.path.dirname(__file__), "uploads", "test.pdf")

    if not os.path.exists(pdf_path):
        print(f"Test file not found: {pdf_path}")
        print("Test 8: SKIPPED\n")
        return

    api = api_access()

    try:
        print(f"Analyzing PDF with OCR: {pdf_path}")
        result = api.analyze_pdf_with_ocr(pdf_path, prompt="Conclude the content of this PDF")

        print(f"Pages processed: {len(result.get('pages', []))}")
        print(f"Full text length: {len(result.get('full_text', ''))} chars")
        print(f"Summary: {result.get('summary', '')[:300]}...")

        print("\nTest 8: PASSED\n")
    except Exception as e:
        print(f"Test 8: FAILED - {e}\n")


def test_pptx_with_ocr():
    """Test PPTX analysis with OCR"""
    print("=" * 50)
    print("Test 9: PPTX OCR Analysis")
    print("=" * 50)

    pptx_path = os.path.join(os.path.dirname(__file__), "uploads", "test.pptx")

    if not os.path.exists(pptx_path):
        print(f"Test file not found: {pptx_path}")
        print("Test 9: SKIPPED\n")
        return

    api = api_access()

    try:
        print(f"Analyzing PPTX with OCR: {pptx_path}")
        result = api.analyze_pptx_with_ocr(pptx_path, prompt="请总结这个PPT的内容")

        print(f"Slides processed: {len(result.get('slides', []))}")
        print(f"Full text length: {len(result.get('full_text', ''))} chars")
        print(f"Summary: {result.get('summary', '')[:300]}...")

        print("\nTest 9: PASSED\n")
    except Exception as e:
        print(f"Test 9: FAILED - {e}\n")


def test_txt_file():
    """Test TXT file parsing"""
    print("=" * 50)
    print("Test 4: TXT File Parsing")
    print("=" * 50)

    from services.slide_parser import parse_txt

    txt_path = os.path.join(os.path.dirname(__file__), "uploads", "test.txt")

    # Create a test txt if not exists
    if not os.path.exists(txt_path):
        print("test.txt not found, creating sample...")
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write("This is a test document.\nMachine learning is a subset of AI.\nDeep learning uses neural networks.")

    try:
        result = parse_txt(txt_path, "test-txt", "test.txt")
        print(f"Content: {result['content'][:100]}...")
        print(f"Summary: {result['summary']}")
        print("Test 4: PASSED\n")
    except Exception as e:
        print(f"Test 4: FAILED - {e}\n")


def test_docx_file():
    """Test DOCX file parsing"""
    print("=" * 50)
    print("Test 5: DOCX File Parsing")
    print("=" * 50)

    from services.slide_parser import parse_docx

    docx_path = os.path.join(os.path.dirname(__file__), "uploads", "test.docx")

    if not os.path.exists(docx_path):
        print(f"Test file not found: {docx_path}")
        print("Test 5: SKIPPED\n")
        return

    try:
        result = parse_docx(docx_path, "test-docx", "test.docx")
        print(f"Content length: {len(result['content'])} chars")
        print(f"Summary: {result['summary'][:100]}...")
        print("Test 5: PASSED\n")
    except Exception as e:
        print(f"Test 5: FAILED - {e}\n")


def test_explain_term():
    """Test explain_term function"""
    print("=" * 50)
    print("Test 10: Explain Term")
    print("=" * 50)

    api = api_access()

    try:
        result = api.explain_term("Machine Learning")
        print(f"Result: {result}")
        print("\nTest 10: PASSED\n")
    except Exception as e:
        print(f"Test 10: FAILED - {e}\n")


def main():
    print("\n" + "=" * 50)
    print("API Calling Test Suite")
    print("=" * 50 + "\n")

    # test_chat()
    # test_multiturn_chat()
    # test_pptx_conversion()
    # test_pptx_image_analysis()
    # test_pdf_file_analysis()
    # test_ocr_image()
    # test_pdf_with_ocr()
    # test_pptx_with_ocr()
    # test_txt_file()
    # test_docx_file()
    test_explain_term()

    print("=" * 50)
    print("All tests completed")
    print("=" * 50)


if __name__ == "__main__":
    main()
