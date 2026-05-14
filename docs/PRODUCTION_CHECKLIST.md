# LUXORA — Production Deployment Checklist

## 🎯 Overview

LUXORA es una aplicación **React + Vite + Express** diseñada para gestionar reservaciones de transporte VIP. Actualmente usa **localStorage** para datos (desarrollo), pero necesita migrar a una base de datos real para producción.

**Tech Stack:**
- Frontend: React 18 + TypeScript + Tailwind CSS + Vite
- Backend: Node.js + Express
- Storage: localStorage (DEV) → MongoDB/PostgreSQL (PROD)
- Hosting: Netlify / Vercel / AWS / Railway

---

## ✅ Phase 1: Code & Security

### 1.1 Environment Variables

Create `.env.production` with:

```bash
# Public (visible in browser)
VITE_PUBLIC_BUILDER_KEY=your_builder_key_here

# Private (server-side only)
DATABASE_URL=mongodb+srv://user:password@cluster.mongodb.net/luxora
JWT_SECRET=your_super_secret_key_here_minimum_32_chars
NODE_ENV=production
PORT=3000

# Optional integrations
WHATSAPP_API_KEY=your_whatsapp_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

✅ **Use [MCP Integrations](#open-mcp-popover)** to connect services securely

### 1.2 Remove Development Code

```bash
# Remove any console.logs, debuggers, mock data
npx tsc --noEmit              # Verify TypeScript
npm run test                  # Run tests
npm run build                 # Build for production
```

### 1.3 Security Audit

- [ ] No hardcoded secrets in code
- [ ] No API keys in version control
- [ ] CORS properly configured for production domain
- [ ] Rate limiting enabled on API endpoints
- [ ] Input validation on all forms
- [ ] SQL injection / NoSQL injection prevention
- [ ] CSRF protection enabled
- [ ] XSS protection via Content Security Policy

---

## ✅ Phase 2: Backend Migration

### 2.1 Replace localStorage with Database

Currently, LUXORA stores everything in **localStorage**:

**Files to migrate:**
- `client/lib/store.ts` — All CRUD operations
  - `getUsers()` → `GET /api/users`
  - `saveUser()` → `POST /api/users`
  - `getOrganizations()` → `GET /api/organizations`
  - `getCases()` → `GET /api/reservaciones`
  - etc.

### 2.2 Database Schema (MongoDB Example)

```javascript
// Users Collection
db.users.insertOne({
  _id: ObjectId(),
  curp: "STRING (UNIQUE)",
  rfc: "STRING",
  nombre: "STRING",
  apellidoPaterno: "STRING",
  apellidoMaterno: "STRING",
  email: "STRING (UNIQUE, INDEX)",
  telefono: "STRING",
  selfie: "BINARY (store as GridFS)",
  documents: [{
    type: "INE_FRONT" | "INE_BACK" | "LICENCIA" | "DOMICILIO" | "CFDI",
    data: "BINARY (GridFS)",
    verified: Boolean,
    uploadedAt: Date
  }],
  address: {
    calle: "STRING",
    colonia: "STRING",
    ciudad: "STRING",
    estado: "STRING",
    cp: "STRING"
  },
  riskScore: Number,
  riskLevel: "PENDING" | "APPROVED" | "REVIEW" | "REJECTED",
  createdAt: Date,
  updatedAt: Date
});

// Organizations Collection
db.organizations.insertOne({
  _id: ObjectId(),
  businessName: "STRING (UNIQUE)",
  rfc: "STRING (UNIQUE, INDEX)",
  calle: "STRING",
  colonia: "STRING",
  ciudad: "STRING",
  estado: "STRING",
  cp: "STRING",
  createdAt: Date,
  updatedAt: Date
});

// Reservaciones (Cases) Collection
db.reservaciones.insertOne({
  _id: ObjectId(),
  caseNumber: "LUX-YYYY-XXXX (UNIQUE, INDEX)",
  status: "RESERVACION" | "INVITACION_ENVIADA" | "KYC_EN_PROGRESO" | ... ,
  vehicleId: ObjectId(),
  participants: [{
    userId: ObjectId() | null,
    organizationId: ObjectId() | null,
    representativeUserId: ObjectId() | null,
    role: "RESPONSABLE" | "AVAL" | "OPERADOR",
    status: "PENDIENTE" | "INVITADO" | "EN_PROGRESO" | "COMPLETADO",
    kycComplete: Boolean,
    inviteToken: "STRING (UNIQUE, INDEX)",
    inviteSentAt: Date
  }],
  montoRenta: Number,
  apartadoMonto: Number,
  abonos: [{
    monto: Number,
    fecha: Date,
    formaPago: "STRING"
  }],
  createdAt: Date,
  updatedAt: Date
});
```

### 2.3 Create Backend API Endpoints

**Required endpoints:**

```
POST   /api/auth/register          — User registration (if applicable)
POST   /api/auth/login             — Login (returns JWT token)

GET    /api/users                  — List all users
GET    /api/users/:id              — Get user details
POST   /api/users                  — Create user
PUT    /api/users/:id              — Update user
DELETE /api/users/:id              — Delete user

GET    /api/organizations          — List all organizations
GET    /api/organizations/:id      — Get org details
POST   /api/organizations          — Create organization
PUT    /api/organizations/:id      — Update organization
DELETE /api/organizations/:id      — Delete organization
POST   /api/organizations/:id/members    — Add member
DELETE /api/organizations/:id/members/:memberId — Remove member

GET    /api/reservaciones          — List reservations
GET    /api/reservaciones/:id      — Get reservation details
POST   /api/reservaciones          — Create reservation
PUT    /api/reservaciones/:id      — Update reservation
DELETE /api/reservaciones/:id      — Delete reservation

POST   /api/kyc/:caseId/:role/:token  — KYC submission (public link)

POST   /api/whatsapp/send-kyc-link — Send WhatsApp KYC invite
```

### 2.4 JWT Authentication

Protect all API routes:

```typescript
// middleware/auth.ts
export function verifyToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Usage in routes
app.get("/api/users", verifyToken, (req, res) => {
  // Only authenticated users can access
});
```

---

## ✅ Phase 3: Image Storage

### 3.1 Move from Base64 → Cloud Storage

**Current problem:** Storing large base64 images in localStorage

**Solutions:**

#### Option A: AWS S3 (Recommended for production)
```typescript
import AWS from "aws-sdk";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
});

export async function uploadToS3(file: Buffer, key: string) {
  return s3.upload({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key, // e.g., "users/userId/selfie.jpg"
    Body: file,
  }).promise();
}
```

#### Option B: Cloudinary (Easier, free tier available)
```typescript
import cloudinary from "cloudinary";

export async function uploadToCloudinary(dataUrl: string) {
  const result = await cloudinary.v2.uploader.upload(dataUrl, {
    folder: "luxora/users",
  });
  return result.secure_url; // Returns public URL
}
```

#### Option C: Firebase Storage
```typescript
import { storage } from "firebase-admin";

export async function uploadToFirebase(file: Buffer, path: string) {
  const bucket = storage().bucket();
  const file_obj = bucket.file(path);
  await file_obj.save(file);
  return `gs://bucket-name/${path}`;
}
```

**Update store to use URLs instead of base64:**

```typescript
// Before (localStorage with base64)
const user = {
  selfie: "data:image/jpeg;base64,/9j/4AAQSkZJRg...", // 2MB string
};

// After (store URL)
const user = {
  selfie: "https://s3.amazonaws.com/luxora/users/user-id/selfie.jpg",
};
```

---

## ✅ Phase 4: Integrations

### 4.1 WhatsApp Integration

**Send KYC links via WhatsApp:**

```typescript
// Using Twilio (easy integration)
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendKycLinkViaSms(phoneNumber: string, caseId: string, role: string, token: string) {
  const kycUrl = `${process.env.APP_URL}/kyc/${caseId}/${role}/${token}`;
  const message = await client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: `+52${phoneNumber}`, // Mexican number
    body: `🚐 LUXORA — Valida tu identidad en: ${kycUrl}`,
  });
  return message.sid;
}
```

### 4.2 Email (Optional)

```typescript
// Using SendGrid
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendKycEmail(email: string, caseId: string, role: string, token: string) {
  const kycUrl = `${process.env.APP_URL}/kyc/${caseId}/${role}/${token}`;
  await sgMail.send({
    to: email,
    from: process.env.FROM_EMAIL!,
    subject: "LUXORA — Valida tu identidad",
    html: `<a href="${kycUrl}">Click aquí para continuar tu validación</a>`,
  });
}
```

### 4.3 Stripe Integration (For Payments)

```typescript
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createPaymentIntent(amount: number, currency: string = "MXN") {
  return stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency,
  });
}
```

---

## ✅ Phase 5: Deployment

### 5.1 Build for Production

```bash
npm run build                    # Builds client + server
npm start                        # Runs Node.js server (port 3000)
```

### 5.2 Hosting Options

#### **Option A: Netlify** (Recommended for SPA)
1. Connect GitHub repo
2. Build command: `npm run build:client`
3. Publish directory: `dist/spa`
4. Environment variables in Settings → Build & Deploy → Environment
5. Auto-deploys on git push

#### **Option B: Vercel** (Recommended for full-stack)
1. Import project from GitHub
2. Select Root Directory: `.`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Environment variables in Settings
6. Auto-deploys on push

#### **Option C: Railway / Render** (For Node.js + MongoDB)
1. Connect GitHub repo
2. Set `PORT=3000` environment variable
3. Ensure `DATABASE_URL` is set
4. Deploy

#### **Option D: Docker + AWS / GCP / Azure**
```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
```

### 5.3 SSL Certificate

Ensure HTTPS is enabled:
- Netlify/Vercel: Automatic
- Self-hosted: Use Let's Encrypt (free) via Certbot

```bash
# Example with Certbot
sudo certbot certonly --standalone -d yourdomain.com
```

---

## ✅ Phase 6: Monitoring & Maintenance

### 6.1 Error Tracking

Use **Sentry** (free tier):

```bash
npm install --save @sentry/node
```

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

app.use(Sentry.Handlers.errorHandler());
```

### 6.2 Analytics

- **Frontend:** Google Analytics or Plausible
- **Backend:** Log4j / Winston for logging

```typescript
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

logger.info("User signed up", { userId: "123" });
logger.error("Database connection failed", { error: err });
```

### 6.3 Backup Strategy

- Database: Daily automated backups (MongoDB Atlas, AWS RDS)
- Images: S3 versioning enabled
- Code: GitHub as backup

### 6.4 Performance

- Enable CDN for static assets
- Minify/compress responses
- Cache API responses (Redis)
- Monitor Core Web Vitals

---

## 📋 Pre-Launch Checklist

```
[ ] All environment variables set in production
[ ] Database migrated from localStorage
[ ] Images stored in cloud (S3/Cloudinary/Firebase)
[ ] JWT authentication implemented
[ ] CORS configured for production domain
[ ] Rate limiting enabled
[ ] Error tracking (Sentry) configured
[ ] WhatsApp integration tested
[ ] Tests passing (npm run test)
[ ] Build succeeds (npm run build)
[ ] No console.logs or debug code
[ ] SSL certificate active (HTTPS)
[ ] Database backups configured
[ ] Monitoring/logging active
[ ] Load testing completed
[ ] Documentation updated
[ ] Team trained on operations
```

---

## 🚀 Launch Timeline

**Week 1:** Prepare environment, set up database, migrate code
**Week 2:** Image storage, integrations, testing
**Week 3:** Load testing, monitoring, final checks
**Week 4:** Beta launch, gather feedback, fix issues
**Week 5:** Production launch

---

## 📞 Support

For specific integration help, use the [MCP Integrations](#open-mcp-popover):
- **Netlify** — Hosting
- **Vercel** — Hosting
- **Neon** — PostgreSQL database
- **MongoDB Atlas** — MongoDB hosting

---

## Next Steps

1. Choose database: MongoDB or PostgreSQL
2. Choose cloud storage: AWS S3, Cloudinary, or Firebase
3. Choose hosting: Netlify, Vercel, or self-hosted
4. Create backend API endpoints
5. Migrate localStorage to database
6. Test entire flow end-to-end
7. Deploy to production

Good luck! 🚀
