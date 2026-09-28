import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding TapTag.one enterprise database on Neon.tech...");

  // 1. Create Enterprise Fleet Admin & Vehicle Owner
  const owner = await prisma.user.upsert({
    where: { email: "admin@taptag.one" },
    update: {},
    create: {
      email: "admin@taptag.one",
      name: "سلطان العتيبي (مدير العمليات والأساطيل)",
      phone: "+966555123456",
      role: "ADMIN",
    },
  });

  console.log(`Created user: ${owner.name} (${owner.id})`);

  // 2. Define Sample Production Tags
  const sampleTags = [
    {
      tagUid: "MW-88219-X",
      secretHash: "sec_hash_88219_alpha",
      status: "ACTIVE",
      profile: {
        vehiclePlate: "أ ب ج 1234",
        vehicleMake: "Toyota",
        vehicleModel: "Land Cruiser GR Sport",
        vehicleColor: "White Pearl (أبيض لؤلؤي)",
        emergencyContactPhone: "+966555123456",
        autoResponseText: "سأعود للمركبة خلال 15 دقيقة، شكراً لصبركم.",
        autoResponseEnabled: false,
        notifyWhatsApp: true,
        notifyTelegram: true,
        notifyPush: true,
        notifySms: true,
      },
    },
    {
      tagUid: "MW-74190-K",
      secretHash: "sec_hash_74190_beta",
      status: "AWAY",
      profile: {
        vehiclePlate: "د هـ و 9988",
        vehicleMake: "Lexus",
        vehicleModel: "LX 600 VIP",
        vehicleColor: "Obsidian Black (أسود ملكي)",
        emergencyContactPhone: "+966555987654",
        autoResponseText: "في اجتماع عمل مغلق حتى الساعة 2:00 ظهراً، للتواصل العاجل استخدم المكالمة المشفرة.",
        autoResponseEnabled: true,
        notifyWhatsApp: true,
        notifyTelegram: false,
        notifyPush: true,
        notifySms: false,
      },
    },
    {
      tagUid: "MW-55201-M",
      secretHash: "sec_hash_55201_gamma",
      status: "DND",
      profile: {
        vehiclePlate: "س ص ع 5500",
        vehicleMake: "Mercedes-Benz",
        vehicleModel: "S-Class S580",
        vehicleColor: "Selenite Grey (رمادي سيلينيت)",
        emergencyContactPhone: "+966555333222",
        autoResponseText: "المركبة في وضع الحماية الخاص. التنبيهات مخصصة للحالات الطارئة فقط.",
        autoResponseEnabled: true,
        notifyWhatsApp: true,
        notifyTelegram: true,
        notifyPush: true,
        notifySms: true,
      },
    },
    {
      tagUid: "MW-11045-T",
      secretHash: "sec_hash_11045_delta",
      status: "SUSPENDED",
      profile: {
        vehiclePlate: "ر ز ط 1010",
        vehicleMake: "GMC",
        vehicleModel: "Yukon Denali",
        vehicleColor: "Deep Bronze",
        emergencyContactPhone: "+966555444111",
        autoResponseText: "البطاقة موقوفة مؤقتاً لأعمال الصيانة الدورية.",
        autoResponseEnabled: false,
        notifyWhatsApp: false,
        notifyTelegram: false,
        notifyPush: false,
        notifySms: false,
      },
    },
  ];

  for (const t of sampleTags) {
    const existing = await prisma.tag.findUnique({
      where: { tagUid: t.tagUid },
    });

    if (!existing) {
      const createdTag = await prisma.tag.create({
        data: {
          tagUid: t.tagUid,
          secretHash: t.secretHash,
          status: t.status,
          userId: owner.id,
          profile: {
            create: t.profile,
          },
        },
      });

      // Add initial scan / event logs
      await prisma.incidentLog.create({
        data: {
          tagId: createdTag.id,
          eventType: "SCAN",
          ipAddressHash: "system_init_hash",
          status: "RESOLVED",
          metadata: { note: "Initial physical tag activation and scan audit" },
        },
      });

      console.log(`Seeded tag: ${createdTag.tagUid} - ${t.profile.vehiclePlate}`);
    }
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
