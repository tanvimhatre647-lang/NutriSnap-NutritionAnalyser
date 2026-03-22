# NutriSnap Deployment Guide

## Step 1: MongoDB Atlas (Free Cloud Database)

1. Go to https://cloud.mongodb.com and sign up free
2. Create a new Project -> Build a Database -> FREE (M0 Sandbox)
3. Choose a cloud provider (AWS) and region closest to you
4. Create a username and password (save these!)
5. Under Network Access -> Add IP Address -> Allow Access from Anywhere (0.0.0.0/0)
6. Under Database -> Connect -> Drivers -> copy the connection string
   It looks like: mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/
7. Replace <password> with your actual password and add 'nutrisnap' as the database name:
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/nutrisnap

## Step 2: Deploy Backend to Render (Free)

1. Push the backend/ folder to a GitHub repository
   OR upload the entire NutriSnap-Clean folder to GitHub
2. Go to https://render.com and sign up free
3. New -> Web Service -> connect your GitHub repo
4. Settings:
   - Root Directory: backend
   - Build Command: npm install
   - Start Command: npm start
5. Add Environment Variables:
   - MONGO_URI  = (your MongoDB Atlas connection string from Step 1)
   - JWT_SECRET = (any long random string, e.g. nutrisnap_jwt_secret_2024_xyz)
   - SPOONACULAR_API_KEY = (from spoonacular.com/food-api)
6. Click Deploy
7. Once deployed, copy your URL - it looks like: https://nutrisnap-api.onrender.com

## Step 3: Update Frontend Config

Open  js/config.js  and paste your Render URL:

   window.NUTRISNAP_API_URL = 'https://nutrisnap-api.onrender.com';

Save the file.

## Step 4: Deploy Frontend to Netlify (Free)

1. Go to https://netlify.com and sign up free
2. Drag and drop the entire NutriSnap-Clean folder onto the Netlify dashboard
3. Done! Your site is live.

OR use GitHub:
1. Push NutriSnap-Clean to GitHub
2. Netlify -> New Site -> Import from Git -> select your repo
3. Publish directory: . (dot, meaning root)
4. Deploy

## Local Development

1. Copy backend/.env.example to backend/.env and fill values
2. cd backend && npm install && npm start
3. Open login.html with VS Code Live Server
   (config.js has empty URL so it uses localhost:5000 automatically)
