# ClinicPro - Clinic Management System

A comprehensive, full-stack clinic management system built with Next.js 16, Prisma, and TypeScript. This system provides complete solutions for managing patients, appointments, electronic medical records, billing, pharmacy inventory, and more.

## Features

### Core Modules

- **Patient Management** - Complete patient registration, history tracking, and search functionality
- **Doctor Management** - Doctor profiles, specializations, schedules, and availability
- **Staff Management** - Staff profiles with role-based access control
- **Appointment Scheduling** - Calendar-based scheduling with status management
- **Electronic Medical Records (EMR)** - Comprehensive patient records with vitals, diagnoses, and treatment plans
- **Lab Test Management** - Order tests, track results, and manage lab workflows
- **Billing & Invoicing** - Generate invoices, track payments, and manage billing items
- **Pharmacy/Inventory** - Medication management with stock tracking and low-stock alerts
- **Prescription Management** - Create, dispense, and track prescriptions

### Advanced Features

- **Role-Based Access Control (RBAC)** - Granular permissions system with customizable roles
- **WhatsApp Integration** - Send appointment reminders and notifications via WhatsApp
- **Email Notifications** - Automated email notifications for appointments and results
- **AI Doctor Assistant** - AI-powered diagnosis suggestions and treatment recommendations
- **Analytics Dashboard** - Visual insights into clinic operations, revenue, and patient statistics

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: MySQL/MariaDB with Prisma ORM
- **Authentication**: JWT with HTTP-only cookies (bcrypt password hashing)
- **Styling**: Tailwind CSS 4 with shadcn/ui components
- **State Management**: SWR for data fetching and caching
- **Validation**: Zod for schema validation
- **AI Integration**: Vercel AI SDK with OpenAI

## Getting Started

### Prerequisites

- Node.js 18+ 
- MariaDB or MySQL database
- pnpm (recommended) or npm

### Installation

1. **Clone/Download the repository**
   ```bash
   # If using git
   git clone <repository-url>
   cd clinic-management-system
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your database credentials (see below).

4. **Set up MariaDB database**
   ```bash
   # Login to MariaDB
   mysql -u root -p
   
   # Create database
   CREATE DATABASE clinic_management;
   
   # Create user (optional, can use root for local dev)
   CREATE USER 'clinic_user'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON clinic_management.* TO 'clinic_user'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

5. **Configure DATABASE_URL in .env.local**
   ```bash
   # Format: mysql://USER:PASSWORD@HOST:PORT/DATABASE
   DATABASE_URL="mysql://root:your_password@localhost:3306/clinic_management"
   
   # Or with custom user
   DATABASE_URL="mysql://clinic_user:your_password@localhost:3306/clinic_management"
   ```

6. **Generate Prisma client and push schema**
   ```bash
   # Generate Prisma client
   pnpm db:generate
   
   # Create tables in database
   pnpm db:push
   
   # Seed with sample data (optional but recommended)
   pnpm db:seed
   ```

7. **Start the development server**
   ```bash
   pnpm dev
   ```

8. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Default Login Credentials

After running the seed script, you can use these accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@clinic.com | admin123 |
| Doctor | doctor@clinic.com | doctor123 |
| Receptionist | reception@clinic.com | receptionist123 |

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL/MariaDB connection string | `mysql://root:password@localhost:3306/clinic_db` |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) | `your-super-secret-key-at-least-32-characters` |

### Optional Variables

| Variable | Description |
|----------|-------------|
| `WHATSAPP_API_URL` | WhatsApp Business API URL |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp phone number ID |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP server port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |
| `SMTP_FROM` | Email sender address |
| `OPENAI_API_KEY` | OpenAI API key for AI features |

## Database Commands

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database (creates tables)
pnpm db:push

# Run migrations (for production)
pnpm db:migrate

# Seed database with sample data
pnpm db:seed

# Reset database (WARNING: deletes all data)
pnpm db:reset
```

## Project Structure

```
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/               # Authentication endpoints
│   │   ├── patients/           # Patient CRUD
│   │   ├── doctors/            # Doctor CRUD
│   │   ├── appointments/       # Appointment management
│   │   ├── emr/                # Electronic Medical Records
│   │   ├── billing/            # Billing and invoices
│   │   ├── pharmacy/           # Pharmacy inventory
│   │   ├── lab-tests/          # Lab test management
│   │   ├── prescriptions/      # Prescription management
│   │   ├── notifications/      # WhatsApp/Email notifications
│   │   ├── ai/                 # AI assistant endpoints
│   │   └── analytics/          # Analytics and reporting
│   ├── dashboard/              # Dashboard pages
│   │   ├── patients/
│   │   ├── doctors/
│   │   ├── appointments/
│   │   ├── emr/
│   │   ├── billing/
│   │   ├── pharmacy/
│   │   ├── lab-tests/
│   │   ├── prescriptions/
│   │   ├── notifications/
│   │   ├── ai-assistant/
│   │   ├── analytics/
│   │   ├── staff/
│   │   ├── roles/
│   │   └── settings/
│   └── login/                  # Login/Signup page
├── components/
│   ├── dashboard/              # Dashboard components
│   ├── forms/                  # Form components
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── auth/                   # Authentication utilities
│   ├── contexts/               # React contexts
│   ├── db/                     # Database client and types
│   ├── hooks/                  # Custom React hooks
│   ├── services/               # Business logic services
│   └── validations/            # Zod validation schemas
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Database seed script
└── scripts/                    # Utility scripts
```

## API Documentation

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User login |
| `/api/auth/signup` | POST | User registration |
| `/api/auth/logout` | POST | User logout |
| `/api/auth/me` | GET | Get current user |

### Patients

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/patients` | GET | List all patients |
| `/api/patients` | POST | Create patient |
| `/api/patients/[id]` | GET | Get patient by ID |
| `/api/patients/[id]` | PUT | Update patient |
| `/api/patients/[id]` | DELETE | Delete patient |

### Appointments

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/appointments` | GET | List appointments |
| `/api/appointments` | POST | Create appointment |
| `/api/appointments/[id]` | GET | Get appointment |
| `/api/appointments/[id]` | PUT | Update appointment |
| `/api/appointments/[id]` | DELETE | Delete appointment |

*(Similar endpoints exist for EMR, Lab Tests, Pharmacy, Prescriptions, etc.)*

## Default User Roles

The system comes with predefined roles:

1. **Admin** - Full access to all features
2. **Doctor** - Patient care, EMR, prescriptions
3. **Receptionist** - Appointments, patient registration
4. **Lab Technician** - Lab test management
5. **Pharmacist** - Pharmacy and prescriptions
6. **Staff** - Basic read access (default for new signups)

## Security Features

- JWT authentication with HTTP-only cookies
- Password hashing with bcrypt (12 rounds)
- Role-based access control (RBAC)
- Input validation with Zod
- SQL injection protection via Prisma
- Session management with database-backed tokens

## Troubleshooting

### "Cannot find module '@prisma/client'"
Run `pnpm db:generate` to generate the Prisma client.

### "Connection refused" to database
1. Ensure MariaDB/MySQL is running
2. Check your DATABASE_URL is correct
3. Verify the user has permissions on the database

### "Login works but redirects to login page"
1. Ensure JWT_SECRET is set in .env.local
2. Clear browser cookies and try again
3. Check browser console for errors

### "Signup fails with schema error"
Run `pnpm db:push` to sync your database schema with Prisma.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

---

Built with Next.js 16, Prisma, and MariaDB
#   r e m o t e - c l i n i c k  
 