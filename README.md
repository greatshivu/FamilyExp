# Family Exponse - manage family expenses
## Deployment to Render
- Create new project under render, (provide a name)
- Inside project Create New Web Service
- Select Git Source code
- Provide service name
- Select Language - Python3
- Select branch - Git branch
- Region automatically selects
- Root Directory - backend
- Build Command - pip install -r requirements.txt
- start command - uvicorn server:app --host 0.0.0.0 --port $PORT
- Under advanced
--  Health check - /health
--  Build Filters - Included Paths - backend/**
                  - Ignored Paths - frontend/**
- Add custom domain if required and verify