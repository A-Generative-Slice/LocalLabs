from zcatalyst_sdk.catalyst_app import CatalystApp
import os
from dotenv import load_dotenv

load_dotenv()

def test_zia_ocr(image_path):
    # This requires ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN in .env
    # The SDK handles the access token internally if configured correctly
    app = CatalystApp()
    zia = app.zia()
    
    try:
        with open(image_path, 'rb') as img:
            print(f"🧐 Scanning {image_path} with Zia OCR...")
            result = zia.extract_optical_characters(img, {'language': 'eng', 'modelType': 'OCR'})
            
            # Print the extracted text
            print("\n✅ OCR RESULTS:")
            print("-" * 20)
            print(result)
            print("-" * 20)
            
    except Exception as e:
        print(f"❌ Zia OCR Failed: {e}")

if __name__ == "__main__":
    # You can test with any image on your desktop
    test_image = "sample.jpg"
    if os.path.exists(test_image):
        test_zia_ocr(test_image)
    else:
        print(f"Please put a file named '{test_image}' in this folder to test!")
