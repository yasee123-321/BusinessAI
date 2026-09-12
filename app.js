import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is missing.");
    process.exit(1);
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ========================================
// HEALTH CHECK
// ========================================

app.get("/api/health", (req, res) => {
    res.json({
        ok: true,
        message: "BusinessAI Backend يعمل بنجاح"
    });
});

// ========================================
// BUSINESS CALCULATIONS
// ========================================

function calculateBusinessMetrics(data = {}) {
    const price = Number(data.price) || 0;
    const unitCost = Number(data.unitCost) || 0;
    const monthlyFixedCosts = Number(data.monthlyFixedCosts) || 0;
    const monthlySales = Number(data.monthlySales) || 0;
    const startupCapital = Number(data.startupCapital) || 0;

    const profitPerUnit = price - unitCost;

    const grossMargin =
        price > 0
            ? (profitPerUnit / price) * 100
            : 0;

    const breakEvenUnits =
        profitPerUnit > 0
            ? Math.ceil(monthlyFixedCosts / profitPerUnit)
            : null;

    const monthlyRevenue = price * monthlySales;

    const monthlyVariableCosts =
        unitCost * monthlySales;

    const monthlyProfit =
        monthlyRevenue -
        monthlyVariableCosts -
        monthlyFixedCosts;

    const annualProfit = monthlyProfit * 12;

    const returnOnCapital =
        startupCapital > 0
            ? (monthlyProfit / startupCapital) * 100
            : 0;

    return {
        price,
        unitCost,
        monthlyFixedCosts,
        monthlySales,
        startupCapital,
        profitPerUnit,
        grossMargin,
        breakEvenUnits,
        monthlyRevenue,
        monthlyVariableCosts,
        monthlyProfit,
        annualProfit,
        returnOnCapital
    };
}

// ========================================
// BUSINESS CALCULATOR API
// ========================================

app.post("/api/business/calculate", (req, res) => {
    try {
        const metrics = calculateBusinessMetrics(req.body || {});

        res.json({
            success: true,
            metrics
        });
    } catch (error) {
        console.error("Business calculation error:", error);

        res.status(500).json({
            success: false,
            error: "حدث خطأ أثناء حساب بيانات المشروع."
        });
    }
});

// ========================================
// AI CHAT
// ========================================

app.post("/api/chat", async (req, res) => {
    try {
        const messages = Array.isArray(req.body.messages)
            ? req.body.messages
            : [];

        if (!messages.length) {
            return res.status(400).json({
                error: "لم يتم إرسال أي رسالة."
            });
        }

        const cleanMessages = messages
            .filter(
                message =>
                    message &&
                    (message.role === "user" ||
                        message.role === "assistant") &&
                    typeof message.content === "string"
            )
            .slice(-20)
            .map(message => ({
                role: message.role,
                content: message.content.slice(0, 8000)
            }));

        if (
            !cleanMessages.length ||
            cleanMessages[cleanMessages.length - 1].role !== "user"
        ) {
            return res.status(400).json({
                error: "يجب أن تكون آخر رسالة من المستخدم."
            });
        }

        const conversationText = cleanMessages
            .map(message => message.content)
            .join("\n");

        const numbers =
            conversationText.match(/\d+(?:[.,]\d+)?/g) || [];

        const numericValues = numbers.map(value =>
            Number(value.replace(",", "."))
        );

        const financialContext =
            numericValues.length > 0
                ? `
بيانات رقمية ظهرت في المحادثة:

${numericValues.join(", ")}

استخدم الأرقام فقط عندما يكون معناها واضحاً من كلام المستخدم.
لا تفترض معنى الرقم من ترتيبه فقط.
لا تخترع أسعاراً أو مبيعات أو تكاليف غير مذكورة.
`
                : `
لا توجد بيانات مالية كافية حالياً.
إذا طلب المستخدم تحليلاً مالياً، اطلب منه البيانات الناقصة بوضوح.
`;

        const instructions = `
أنت BusinessAI، مساعد أعمال ذكي داخل منصة عربية.

تحدث بالعربية عندما يتحدث المستخدم بالعربية،
واستخدم الإنجليزية عندما يطلب المستخدم ذلك.

مهمتك مساعدة المستخدم في:

- أفكار المشاريع
- تحليل المشاريع
- الجمهور المستهدف
- نموذج العمل
- التسويق
- التسعير
- التكاليف
- الأرباح
- نقطة التعادل
- الميزانية
- رأس المال
- المخاطر
- المنافسة
- خطة التنفيذ
- خطة أول 30 يوماً
- إنشاء وتحسين السيرة الذاتية
- الدراسة والواجبات المتعلقة بالأعمال والتقنية

========================================
القواعد المالية
========================================

عندما يقدم المستخدم بيانات مالية، يمكنك حساب:

الربح لكل وحدة:
سعر البيع - تكلفة الوحدة

هامش الربح:
(الربح لكل وحدة ÷ سعر البيع) × 100

الإيرادات الشهرية:
سعر البيع × عدد الوحدات المباعة

التكاليف المتغيرة:
تكلفة الوحدة × عدد الوحدات المباعة

الربح الشهري:
الإيرادات - التكاليف المتغيرة - المصاريف الثابتة

الربح السنوي التقريبي:
الربح الشهري × 12

نقطة التعادل:
المصاريف الثابتة ÷ الربح لكل وحدة

العائد التقريبي على رأس المال:
الربح الشهري ÷ رأس المال × 100

لا تستخدم أي معادلة إذا كانت البيانات المطلوبة غير موجودة.

========================================
عدم اختراع البيانات
========================================

لا تخترع:

- أسعاراً حقيقية
- عدد مبيعات
- منافسين حقيقيين
- تكاليف
- إيرادات
- معلومات سوقية حديثة

إذا كانت البيانات ناقصة، أخبر المستخدم ما البيانات التي تحتاجها.

إذا استخدمت افتراضاً، اكتب بوضوح:
"هذا افتراض تقريبي وليس رقماً مقدماً من المستخدم."

========================================
تحليل المشروع
========================================

عندما يطلب المستخدم خطة مشروع، حاول تقديم:

1. ملخص المشروع
2. المشكلة التي يحلها
3. الجمهور المستهدف
4. القيمة المقترحة
5. المنتجات أو الخدمات
6. نموذج الإيرادات
7. التسعير
8. التكاليف
9. نقطة التعادل
10. الأرباح المتوقعة
11. المنافسة
12. التسويق
13. المخاطر
14. خطة أول 30 يوماً
15. أهم الخطوات التالية

========================================
السيناريوهات
========================================

عندما تكون البيانات كافية، يمكن إنشاء:

🟢 سيناريو متفائل
🟡 سيناريو واقعي
🔴 سيناريو حذر

يجب أن تكون السيناريوهات مبنية على البيانات الموجودة،
وليس على أرقام عشوائية.

========================================
أسلوب الرد
========================================

- كن واضحاً ومباشراً.
- لا تكثر من الكلام النظري.
- استخدم العناوين والقوائم والجداول عندما تكون مفيدة.
- اشرح الحسابات خطوة بخطوة.
- لا تدّعِ أنك بحثت الإنترنت إذا لم تفعل.
- لا تدّعِ امتلاك بيانات سوقية مباشرة.
- إذا كان السؤال غير واضح، اسأل سؤالاً قصيراً ومفيداً.
- قدم للمستخدم نتيجة عملية يمكنه استخدامها.

========================================
بيانات رقمية مساعدة
========================================

${financialContext}
`;

        const response = await openai.responses.create({
            model:
                process.env.OPENAI_MODEL ||
                "gpt-5.6-luna",

            instructions,

            input: cleanMessages
        });

        const reply =
            response.output_text ||
            "لم أستطع إنشاء رد الآن.";

res.json({
    answer: reply,
    reply
});
    } catch (error) {
        console.error("OpenAI Error:");
        console.error(error);

        res.status(500).json({
            error:
                error?.message ||
                "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي."
        });
    }
});

// ========================================
// FALLBACK
// ========================================

app.use((req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );
});

// ========================================
// START SERVER
// ========================================

app.listen(PORT, "0.0.0.0", () => {
    console.log("");
    console.log("================================");
    console.log("BusinessAI يعمل بنجاح!");
    console.log(`http://localhost:${PORT}`);
    console.log(
        `Model: ${
            process.env.OPENAI_MODEL ||
            "gpt-5.6-luna"
        }`
    );
    console.log("Business Analytics: ON");
    console.log("Break-even Analysis: ON");
    console.log("Profit Analysis: ON");
    console.log("================================");
    console.log("");
});
