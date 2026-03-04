import requests
import os
from dotenv import load_dotenv

load_dotenv()

def get_refresh_token(auth_code):
    client_id = "1000.KKDG35Q806EB3CX17O8O0XTVCZ3N4N"
    client_secret = "8bc77d1b9b89a23809340e9e4dfaa5c7635b5ef15c"
    
    url = "https://accounts.zoho.in/oauth/v2/token" # Using .in as per user screenshot
    
    params = {
        "code": auth_code,
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "authorization_code"
    }
    
    try:
        response = requests.post(url, params=params)
        data = response.json()
        
        if "refresh_token" in data:
            print("\n✅ SUCCESS!")
            print(f"Your Refresh Token: {data['refresh_token']}")
            print("\nAdd this to your .env file as: ZOHO_REFRESH_TOKEN=...")
        else:
            print("\n❌ FAILED")
            print(f"Error: {data.get('error')}")
            print(f"Full response: {data}")
            
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    code = input("Enter the short code from Zoho 'Generate Code' tab: ")
    get_refresh_token(code.strip())
