# Prerequisit
Python
Pylance
NodeJS
NPM
MONGO DB

# Building application

## Create .env file and paste below
MONGO_URL=<Connection string or url>
DB_NAME=<DB Name>
CORS_ORIGINS="*"
JWT_SECRET="<Secret>"
ADMIN_EMAIL="<Admin Account email>"
ADMIN_PASSWORD="<Admin password>"

Enable environment vairable for python.

1) `cd backend`
2) `python -m venv venv`
3) `venv\Scripts\activate`
4) `pip install -r requirements.txt`  one time(Any new packege then run this command)

# Running application
`uvicorn server:app --host 0.0.0.0 --port 8000`

Verify http://localhost:8000/docs will be running
/health
/api/users

any errors, look for module and install using `pip install package_name`

# Deployment using CloudFlare tunnel

## Login to CloudFlare
`cloudflared login`

## Create tunnel
`cloudflared tunnel create familyapi-tunnel`
This outputs a Tunnel ID — keep it.

## Create the tunnel config file

Press 
`Win + r`
then paste below command
`notepad C:\Users\<UserName>\.cloudflared\config.yml`

Or Poweshell
`New-Item -Path "$env:USERPROFILE\.cloudflared\config.yml" -ItemType File`

Then Put below content inside & replace <TUNNEL_ID> with your actual ID && localhost:8000 with your FastAPI port:

tunnel: familyapi-tunnel
credentials-file: C:\Users\<UserName>\.cloudflared\<TUNNEL_ID>.json

ingress:
  - hostname: <Your host Name: Tunneling host name exposed to website>
    service: http://localhost:8000
  - service: http_status:404


## Create DNS record automatically
`cloudflared tunnel route dns familyapi-tunnel <Your host Name which will be exposed to website>`

Cloudflare will create a CNAME like: familyapi → <TUNNEL_ID>.cfargotunnel.com

## Start Tunnel
`cloudflared tunnel run familyapi-tunnel`

## Make sure FastAPI is Running http://localhost:8000
`uvicorn server:app --host 0.0.0.0 --port 8000`

## CORS For front end
rom fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["<hostname- ex- https://xxx.yyy.com>"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)