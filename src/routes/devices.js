const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const {
  assessDevice,
  assessDevices
} = require("../utils/recoveryEngine");

const router = express.Router();
const DATA_FILE = path.join(__dirname, "../../data/devices.json");

const DEMO_DEVICES = [
  { id: "LL-DEMO-001", name: "Dell Latitude 5420", category: "laptop", brand: "Dell", condition: "good", ageYears: 3, weightKg: 1.6, quantity: 12, status: "assessed", location: "IT Department", notes: "Retired office laptops with working displays.", createdAt: "2026-10-01T09:00:00.000Z", demo: true },
  { id: "LL-DEMO-002", name: "HP EliteDesk 800", category: "desktop", brand: "HP", condition: "fair", ageYears: 5, weightKg: 7.2, quantity: 8, status: "collected", location: "Admin Office", notes: "Older desktop systems awaiting inspection.", createdAt: "2026-10-02T09:00:00.000Z", demo: true },
  { id: "LL-DEMO-003", name: "Samsung Office Monitor", category: "monitor", brand: "Samsung", condition: "good", ageYears: 2, weightKg: 3.4, quantity: 15, status: "ready-for-reuse", location: "Training Centre", notes: "Monitors tested and ready for redeployment.", createdAt: "2026-10-03T09:00:00.000Z", demo: true },
  { id: "LL-DEMO-004", name: "Lenovo ThinkPad T480", category: "laptop", brand: "Lenovo", condition: "poor", ageYears: 6, weightKg: 1.8, quantity: 5, status: "in-repair", location: "Repair Desk", notes: "Battery and keyboard require inspection.", createdAt: "2026-10-04T09:00:00.000Z", demo: true },
  { id: "LL-DEMO-005", name: "Apple iPhone 11", category: "phone", brand: "Apple", condition: "fair", ageYears: 4, weightKg: 0.2, quantity: 10, status: "assessed", location: "Mobile Lab", notes: "Used devices pending data wiping and testing.", createdAt: "2026-10-05T09:00:00.000Z", demo: true },
  { id: "LL-DEMO-006", name: "Canon Laser Printer", category: "printer", brand: "Canon", condition: "poor", ageYears: 7, weightKg: 8.5, quantity: 3, status: "recycled", location: "Records Office", notes: "Non-functional printers sent for authorized recycling.", createdAt: "2026-10-06T09:00:00.000Z", demo: true },
  { id: "LL-DEMO-007", name: "Acer Aspire Desktop", category: "desktop", brand: "Acer", condition: "good", ageYears: 3, weightKg: 6.8, quantity: 6, status: "collected", location: "Computer Lab", notes: "Collected systems awaiting assessment.", createdAt: "2026-10-07T09:00:00.000Z", demo: true },
  { id: "LL-DEMO-008", name: "LG LED Television", category: "television", brand: "LG", condition: "fair", ageYears: 5, weightKg: 9.1, quantity: 2, status: "assessed", location: "Conference Room", notes: "Televisions require further functional testing.", createdAt: "2026-10-08T09:00:00.000Z", demo: true }
];

async function readDevices() {
  const devices = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
  if (!Array.isArray(devices)) throw new Error("Device data must be an array.");
  return devices;
}

async function writeDevices(devices) {
  const temp = `${DATA_FILE}.tmp`;
  await fs.writeFile(temp, JSON.stringify(devices, null, 2), "utf8");
  await fs.rename(temp, DATA_FILE);
}

function errorResponse(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

function validateDevice(body, existing = {}) {
  const device = {
    name: String(body.name ?? existing.name ?? "").trim(),
    category: String(body.category ?? existing.category ?? "").trim(),
    brand: String(body.brand ?? existing.brand ?? "").trim(),
    condition: String(body.condition ?? existing.condition ?? "").trim(),
    working: body.working ?? existing.working ?? null,
    ageYears: Number(body.ageYears ?? existing.ageYears),
    weightKg: Number(body.weightKg ?? existing.weightKg),
    quantity: Number(body.quantity ?? existing.quantity),
    status: String(body.status ?? existing.status ?? "collected").trim(),
    location: String(body.location ?? existing.location ?? "").trim(),
    notes: String(body.notes ?? existing.notes ?? "").trim()
  };

  const categories = ["laptop", "desktop", "monitor", "phone", "tablet", "printer", "television", "battery", "other"];
  const conditions = ["excellent", "good", "fair", "poor", "non-functional"];
  const statuses = ["collected", "assessed", "in-repair", "ready-for-reuse", "recycled"];

  if (!device.name || device.name.length > 100) return { error: "Enter a device name (maximum 100 characters)." };
  if (!categories.includes(device.category)) return { error: "Choose a valid category." };
  if (!conditions.includes(device.condition)) return { error: "Choose a valid condition." };
  if (!Number.isFinite(device.ageYears) || device.ageYears < 0 || device.ageYears > 100) return { error: "Age must be between 0 and 100." };
  if (!Number.isFinite(device.weightKg) || device.weightKg <= 0 || device.weightKg > 10000) return { error: "Weight must be greater than 0 and no more than 10,000 kg." };
  if (!Number.isInteger(device.quantity) || device.quantity < 1 || device.quantity > 100000) return { error: "Quantity must be a whole number between 1 and 100,000." };
  if (!statuses.includes(device.status)) return { error: "Choose a valid status." };
  if (device.brand.length > 80 || device.location.length > 120 || device.notes.length > 500) return { error: "Brand, location, or notes are too long." };

  return { device };
}

function enrich(devices) {
  return devices.map((device) => {
    const assessment = assessDevice(device);
    return {
      ...device,
      assessment,
      recommendation: assessment.recommendation,
      estimatedWasteAvoidedKg: assessment.estimatedWasteAvoidedKg ?? assessment.estimatedWasteAvoided ?? 0
    };
  });
}

router.post("/reset-demo", async (req, res, next) => {
  try {
    await writeDevices(DEMO_DEVICES);
    res.json({
      success: true,
      message: "Demo inventory restored.",
      data: enrich(DEMO_DEVICES)
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    let devices = await readDevices();

    const search = String(req.query.search ?? "").trim().toLowerCase();
    const category = String(req.query.category ?? "").trim();
    const status = String(req.query.status ?? "").trim();

    if (search) {
      devices = devices.filter((device) =>
        [device.id, device.name, device.brand, device.location, device.category]
          .some((value) => String(value ?? "").toLowerCase().includes(search))
      );
    }

    if (category) devices = devices.filter((device) => device.category === category);
    if (status) devices = devices.filter((device) => device.status === status);

    devices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = devices.length;
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 500);
    const start = (page - 1) * limit;

    res.json({
      success: true,
      data: enrich(devices.slice(start, start + limit)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const devices = await readDevices();
    const device = devices.find((item) => item.id === req.params.id);
    if (!device) return errorResponse(res, 404, "Device not found.");
    res.json({ success: true, data: enrich([device])[0] });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const result = validateDevice(req.body);
    if (result.error) return errorResponse(res, 400, result.error);

    const devices = await readDevices();
    const device = {
      id: `LL-${randomUUID().slice(0, 8).toUpperCase()}`,
      ...result.device,
      createdAt: new Date().toISOString(),
      demo: false
    };

    devices.push(device);
    await writeDevices(devices);
    res.status(201).json({
      success: true,
      message: "Device added.",
      data: enrich([device])[0]
    });
  } catch (error) {
    next(error);
  }
});

async function updateDevice(req, res, next) {
  try {
    const devices = await readDevices();
    const index = devices.findIndex((item) => item.id === req.params.id);
    if (index === -1) return errorResponse(res, 404, "Device not found.");

    const result = validateDevice(req.body, devices[index]);
    if (result.error) return errorResponse(res, 400, result.error);

    devices[index] = { ...devices[index], ...result.device, updatedAt: new Date().toISOString() };
    await writeDevices(devices);
    res.json({
      success: true,
      message: "Device updated.",
      data: enrich([devices[index]])[0]
    });
  } catch (error) {
    next(error);
  }
}

router.put("/:id", updateDevice);
router.patch("/:id", updateDevice);

router.delete("/:id", async (req, res, next) => {
  try {
    const devices = await readDevices();
    const remaining = devices.filter((item) => item.id !== req.params.id);
    if (remaining.length === devices.length) return errorResponse(res, 404, "Device not found.");

    await writeDevices(remaining);
    res.json({ success: true, message: "Device removed." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;