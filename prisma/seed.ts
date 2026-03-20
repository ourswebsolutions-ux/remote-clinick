import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log("Starting database seed...");

  // Create Permissions
  const modules = [
    "patients",
    "doctors",
    "staff",
    "appointments",
    "emr",
    "lab",
    "billing",
    "pharmacy",
    "notifications",
    "roles",
    "analytics",
    "ai",
    "settings",
  ];

  const actions = ["create", "read", "update", "delete"];

  console.log("Creating permissions...");
  for (const module of modules) {
    for (const action of actions) {
      await prisma.permission.upsert({
        where: { module_action: { module, action } },
        update: {},
        create: {
          module,
          action,
          description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module}`,
        },
      });
    }
  }

  // Get all permissions
  const allPermissions = await prisma.permission.findMany();

  // Create Roles
  console.log("Creating roles...");

  // Admin Role - All permissions
  const adminRole = await prisma.role.upsert({
    where: { name: "Admin" },
    update: {},
    create: {
      name: "Admin",
      description: "Full system access",
      isSystem: true,
    },
  });

  // Assign all permissions to admin
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Doctor Role
  const doctorPermissions = allPermissions.filter((p) =>
    ["patients", "appointments", "emr", "lab", "pharmacy", "ai", "notifications"].includes(p.module)
  );

  const doctorRole = await prisma.role.upsert({
    where: { name: "Doctor" },
    update: {},
    create: {
      name: "Doctor",
      description: "Doctor with access to patients and EMR",
      isSystem: true,
    },
  });

  for (const perm of doctorPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: doctorRole.id, permissionId: perm.id },
      },
      update: {},
      create: {
        roleId: doctorRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Receptionist Role
  const receptionistPermissions = allPermissions.filter(
    (p) =>
      ["patients", "appointments", "billing", "notifications"].includes(p.module) &&
      ["create", "read", "update"].includes(p.action)
  );

  const receptionistRole = await prisma.role.upsert({
    where: { name: "Receptionist" },
    update: {},
    create: {
      name: "Receptionist",
      description: "Front desk operations",
      isSystem: true,
    },
  });

  for (const perm of receptionistPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: receptionistRole.id, permissionId: perm.id },
      },
      update: {},
      create: {
        roleId: receptionistRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Lab Technician Role
  const labPermissions = allPermissions.filter(
    (p) => ["lab", "patients"].includes(p.module) && ["create", "read", "update"].includes(p.action)
  );

  const labRole = await prisma.role.upsert({
    where: { name: "Lab Technician" },
    update: {},
    create: {
      name: "Lab Technician",
      description: "Lab operations",
      isSystem: true,
    },
  });

  for (const perm of labPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: labRole.id, permissionId: perm.id },
      },
      update: {},
      create: {
        roleId: labRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Pharmacist Role
  const pharmacistPermissions = allPermissions.filter(
    (p) =>
      ["pharmacy", "patients", "billing"].includes(p.module) &&
      ["create", "read", "update"].includes(p.action)
  );

  const pharmacistRole = await prisma.role.upsert({
    where: { name: "Pharmacist" },
    update: {},
    create: {
      name: "Pharmacist",
      description: "Pharmacy operations",
      isSystem: true,
    },
  });

  for (const perm of pharmacistPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: pharmacistRole.id, permissionId: perm.id },
      },
      update: {},
      create: {
        roleId: pharmacistRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Staff Role (default for new signups)
  const staffPermissions = allPermissions.filter(
    (p) => ["patients", "appointments"].includes(p.module) && ["read"].includes(p.action)
  );

  const staffRole = await prisma.role.upsert({
    where: { name: "Staff" },
    update: {},
    create: {
      name: "Staff",
      description: "Basic staff with limited access",
      isSystem: false,
    },
  });

  for (const perm of staffPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: staffRole.id, permissionId: perm.id },
      },
      update: {},
      create: {
        roleId: staffRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Create Admin User
  console.log("Creating admin user...");
  const hashedAdminPassword = await hashPassword("admin123");

  await prisma.user.upsert({
    where: { email: "admin@clinic.com" },
    update: {
      password: hashedAdminPassword,
    },
    create: {
      email: "admin@clinic.com",
      password: hashedAdminPassword,
      name: "System Admin",
      phone: "+923001234567",
      roleId: adminRole.id,
    },
  });

  // Create Sample Doctor
  console.log("Creating sample doctor...");
  const hashedDoctorPassword = await hashPassword("doctor123");

  const doctorUser = await prisma.user.upsert({
    where: { email: "doctor@clinic.com" },
    update: {
      password: hashedDoctorPassword,
    },
    create: {
      email: "doctor@clinic.com",
      password: hashedDoctorPassword,
      name: "Dr. Ahmed Khan",
      phone: "+923009876543",
      roleId: doctorRole.id,
    },
  });

  const doctor = await prisma.doctor.upsert({
    where: { userId: doctorUser.id },
    update: {},
    create: {
      userId: doctorUser.id,
      specialization: "General Physician",
      qualification: "MBBS, FCPS",
      licenseNumber: "PMC-12345",
      experience: 10,
      consultationFee: 1500,
      bio: "Experienced general physician with over 10 years of practice.",
    },
  });

  // Create Doctor Availability
  const daysOfWeek = [1, 2, 3, 4, 5]; // Monday to Friday
  for (const day of daysOfWeek) {
    const availabilityId = `${doctor.id}-${day}`;
    const existing = await prisma.doctorAvailability.findFirst({
      where: { doctorId: doctor.id, dayOfWeek: day }
    });
    if (!existing) {
      await prisma.doctorAvailability.create({
        data: {
          doctorId: doctor.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "17:00",
          isActive: true,
        },
      });
    }
  }

  // Create Sample Receptionist
  console.log("Creating sample receptionist...");
  const hashedReceptionistPassword = await hashPassword("receptionist123");

  const receptionistUser = await prisma.user.upsert({
    where: { email: "reception@clinic.com" },
    update: {
      password: hashedReceptionistPassword,
    },
    create: {
      email: "reception@clinic.com",
      password: hashedReceptionistPassword,
      name: "Sarah Ali",
      phone: "+923001122334",
      roleId: receptionistRole.id,
    },
  });

  const existingStaff = await prisma.staff.findUnique({
    where: { userId: receptionistUser.id }
  });
  
  if (!existingStaff) {
    await prisma.staff.create({
      data: {
        userId: receptionistUser.id,
        department: "Front Desk",
        position: "Senior Receptionist",
        hireDate: new Date("2022-01-15"),
        salary: 50000,
      },
    });
  }

  // Create Sample Patients
  console.log("Creating sample patients...");
  const patients = [
    {
      patientNumber: "PAT-001",
      firstName: "Muhammad",
      lastName: "Ali",
      dateOfBirth: new Date("1985-05-15"),
      gender: "MALE" as const,
      cnic: "12345-6789012-3",
      phone: "+923001234500",
      email: "muhammad.ali@email.com",
      address: "House 123, Street 5, Gulberg",
      city: "Lahore",
      bloodGroup: "O_POSITIVE" as const,
    },
    {
      patientNumber: "PAT-002",
      firstName: "Fatima",
      lastName: "Hassan",
      dateOfBirth: new Date("1990-08-22"),
      gender: "FEMALE" as const,
      cnic: "12345-6789012-4",
      phone: "+923001234501",
      email: "fatima.hassan@email.com",
      address: "Flat 5, Block B, DHA Phase 6",
      city: "Karachi",
      bloodGroup: "A_POSITIVE" as const,
    },
    {
      patientNumber: "PAT-003",
      firstName: "Ahmed",
      lastName: "Malik",
      dateOfBirth: new Date("1978-12-01"),
      gender: "MALE" as const,
      cnic: "12345-6789012-5",
      phone: "+923001234502",
      address: "House 45, F-7/2",
      city: "Islamabad",
      bloodGroup: "B_POSITIVE" as const,
    },
  ];

  for (const patientData of patients) {
    await prisma.patient.upsert({
      where: { patientNumber: patientData.patientNumber },
      update: {},
      create: patientData,
    });
  }

  // Create Sample Medicines
  console.log("Creating sample medicines...");
  const medicines = [
    {
      name: "Panadol Extra",
      genericName: "Paracetamol 500mg + Caffeine 65mg",
      category: "Pain Relief",
      manufacturer: "GSK",
      dosageForm: "Tablet",
      strength: "500mg",
      unitPrice: 2.5,
      stock: 500,
      minStock: 50,
      expiryDate: new Date("2025-12-31"),
      batchNumber: "PAD-2024-001",
    },
    {
      name: "Augmentin 625",
      genericName: "Amoxicillin + Clavulanic Acid",
      category: "Antibiotics",
      manufacturer: "GSK",
      dosageForm: "Tablet",
      strength: "625mg",
      unitPrice: 85,
      stock: 200,
      minStock: 30,
      expiryDate: new Date("2025-06-30"),
      batchNumber: "AUG-2024-001",
    },
    {
      name: "Omeprazole 20mg",
      genericName: "Omeprazole",
      category: "Gastro",
      manufacturer: "Getz Pharma",
      dosageForm: "Capsule",
      strength: "20mg",
      unitPrice: 15,
      stock: 300,
      minStock: 40,
      expiryDate: new Date("2025-09-30"),
      batchNumber: "OME-2024-001",
    },
    {
      name: "Brufen 400",
      genericName: "Ibuprofen",
      category: "Pain Relief",
      manufacturer: "Abbott",
      dosageForm: "Tablet",
      strength: "400mg",
      unitPrice: 8,
      stock: 400,
      minStock: 50,
      expiryDate: new Date("2025-08-31"),
      batchNumber: "BRU-2024-001",
    },
    {
      name: "Flagyl 400",
      genericName: "Metronidazole",
      category: "Antibiotics",
      manufacturer: "Sanofi",
      dosageForm: "Tablet",
      strength: "400mg",
      unitPrice: 12,
      stock: 250,
      minStock: 35,
      expiryDate: new Date("2025-10-31"),
      batchNumber: "FLG-2024-001",
    },
  ];

  for (const medicine of medicines) {
    const existing = await prisma.medicine.findFirst({
      where: { name: medicine.name }
    });
    if (!existing) {
      await prisma.medicine.create({
        data: medicine,
      });
    }
  }

  // Create Settings
  console.log("Creating default settings...");
  const settings = [
    { key: "clinic_name", value: "City Medical Clinic", category: "general" },
    { key: "clinic_address", value: "123 Main Street, City Center", category: "general" },
    { key: "clinic_phone", value: "+92-300-1234567", category: "general" },
    { key: "clinic_email", value: "info@citymedical.com", category: "general" },
    { key: "appointment_duration", value: "30", type: "number", category: "appointments" },
    { key: "working_hours_start", value: "09:00", category: "appointments" },
    { key: "working_hours_end", value: "18:00", category: "appointments" },
    { key: "currency", value: "PKR", category: "billing" },
    { key: "tax_rate", value: "0", type: "number", category: "billing" },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        key: setting.key,
        value: setting.value,
        type: setting.type || "string",
        category: setting.category,
      },
    });
  }

  console.log("\n✅ Seed completed successfully!");
  console.log("\n📋 Default Credentials:");
  console.log("   Admin: admin@clinic.com / admin123");
  console.log("   Doctor: doctor@clinic.com / doctor123");
  console.log("   Receptionist: reception@clinic.com / receptionist123\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
