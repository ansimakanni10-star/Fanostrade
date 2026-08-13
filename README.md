# Backend Fano's Trade — formulaire de contact

Ce petit serveur reçoit les demandes du formulaire de contact du site et envoie :
1. un e-mail à **ansimakanni10@gmail.com** avec les détails de la demande,
2. un e-mail de confirmation automatique au client.

## 1. Créer le mot de passe d'application Gmail

Gmail n'accepte plus le mot de passe normal pour l'envoi automatique. Il faut créer un "mot de passe d'application" :

1. Va sur https://myaccount.google.com/security
2. Active la **validation en deux étapes** si ce n'est pas déjà fait (obligatoire pour l'étape suivante).
3. Va sur https://myaccount.google.com/apppasswords
4. Crée un mot de passe d'application (nom libre, ex. "Fano's Trade site").
5. Copie le code à 16 caractères généré — c'est ta variable `GMAIL_APP_PASSWORD`.

## 2. Configurer les variables d'environnement

Copie `.env.example` en `.env` et remplis :

```
GMAIL_USER=ansimakanni10@gmail.com
GMAIL_APP_PASSWORD=le_code_16_caracteres
NOTIFY_EMAIL=ansimakanni10@gmail.com
ALLOWED_ORIGINS=*
PORT=3000
```

## 3. Tester en local (optionnel)

```
npm install
npm start
```

Le serveur tourne sur `http://localhost:3000`. Teste avec :

```
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"nom":"Test","telephone":"0143450901","email":"test@test.com","produit":"Test produit","message":"Ceci est un test"}'
```

## 4. Déployer en ligne (gratuit, recommandé : Render.com)

1. Crée un compte sur https://render.com
2. "New +" → "Web Service"
3. Connecte ton dépôt GitHub contenant ce dossier `backend/` (ou uploade-le sur GitHub d'abord)
4. Render détecte Node.js automatiquement :
   - Build command : `npm install`
   - Start command : `npm start`
5. Dans l'onglet "Environment", ajoute les mêmes variables que dans `.env` (GMAIL_USER, GMAIL_APP_PASSWORD, NOTIFY_EMAIL, ALLOWED_ORIGINS).
6. Une fois déployé, Render te donne une URL du type :
   `https://fanostrade-backend.onrender.com`

Alternatives équivalentes si tu préfères : Railway.app, Fly.io, ou un VPS classique avec PM2.

## 5. Brancher le site au backend

Dans `index.html`, trouve cette ligne (dans le script en bas du fichier) :

```js
const API_URL = "https://YOUR-BACKEND-URL.example.com/api/contact";
```

Remplace-la par ton URL réelle, par exemple :

```js
const API_URL = "https://fanostrade-backend.onrender.com/api/contact";
```

Puis mets à jour `ALLOWED_ORIGINS` sur Render avec le vrai domaine de ton site une fois qu'il est en ligne, pour sécuriser les appels.

## Notes

- Le formulaire a un champ anti-robot invisible (honeypot) : les soumissions automatiques sont ignorées silencieusement.
- Une limite de 5 envois par IP toutes les 10 minutes protège contre le spam.
- Sur le plan gratuit de Render, le service peut se "mettre en veille" après une période d'inactivité et mettre ~30s à répondre au premier appel — normal, pas une panne.
