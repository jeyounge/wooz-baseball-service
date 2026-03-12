import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv("../.env.local")

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

# The root endpoint of PostgREST usually returns the OpenAPI spec 
# which contains all available tables.
try:
    response = requests.get(f"{url}/rest/v1/", headers=headers)
    response.raise_for_status()
    openapi_spec = response.json()
    
    # Tables are listed under "definitions"
    if "definitions" in openapi_spec:
        tables = list(openapi_spec["definitions"].keys())
        print("Available tables in the API scheme:")
        for table in tables:
            print(f"- {table}")
    else:
        print("Couldn't find definitions in the OpenAPI spec.")
        print(str(openapi_spec)[:500])
except Exception as e:
    print(f"Error fetching API spec: {e}")
