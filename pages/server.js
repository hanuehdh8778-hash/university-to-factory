const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = 3000;

// =========================
// إعدادات السيرفر
// =========================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "..")));


// =========================
// قاعدة البيانات
// =========================

const dbPath = path.join(__dirname, "..", "users.db");

const db = new sqlite3.Database(dbPath, (err) => {

    if (err) {
        console.error("Database connection error:", err.message);
    } else {
        console.log("Database connected successfully");
    }

});


// =========================
// إنشاء الجداول
// =========================

db.serialize(() => {

    // الطلاب
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            password TEXT
        )
    `);

    // الشركات
    db.run(`
        CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            password TEXT,
            field TEXT,
            location TEXT,
            description TEXT
        )
    `);

    // المصانع
    db.run(`
        CREATE TABLE IF NOT EXISTS factories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            field TEXT NOT NULL,
            location TEXT NOT NULL,
            description TEXT NOT NULL
        )
    `);

    // الفرص
    db.run(`
        CREATE TABLE IF NOT EXISTS opportunities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_email TEXT,
            title TEXT,
            type TEXT,
            field TEXT,
            location TEXT,
            description TEXT,
            skills TEXT,
            deadline TEXT
        )
    `);

    // التقديمات
    db.run(`
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT,
            opportunity_id TEXT,
            opportunity_name TEXT,
            status TEXT DEFAULT 'قيد المراجعة',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // مهارات الطلاب
    db.run(`
        CREATE TABLE IF NOT EXISTS user_skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT UNIQUE,
            skills TEXT
        )
    `);

    // ملف المطابقة الذكية
    db.run(`
        CREATE TABLE IF NOT EXISTS user_matching_profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT UNIQUE,
            field TEXT,
            location TEXT,
            preferred_type TEXT,
            experience TEXT,
            projects TEXT
        )
    `);

});


// =========================
// الصفحة الرئيسية
// =========================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "..", "index.html")
    );

});


// =========================
// تسجيل الطالب
// =========================

// =========================
// تسجيل الطالب
// =========================

app.post("/register", async (req, res) => {

    const {
        name,
        email,
        password,
        college,
        department,
        study_year,
        skills
    } = req.body;

    if (
        !name ||
        !email ||
        !password ||
        !college ||
        !department ||
        !study_year ||
        !skills
    ) {

        return res.status(400).json({
            message: "من فضلك املأ جميع البيانات"
        });

    }

    try {

        const hashedPassword =
            await bcrypt.hash(password, 10);

        db.run(
            `
           INSERT INTO users
(
    name,
    email,
    password,
    college,
    department,
    study_year,
    skills,
    account_type
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                name,
                email,
                hashedPassword,
                college,
                department,
                study_year,
                skills,
                 "student"
            ],
            function(err) {

                if (err) {

                    if (err.message.includes("UNIQUE")) {

                        return res.status(400).json({
                            message:
                                "البريد الإلكتروني مستخدم بالفعل"
                        });

                    }

                    console.error(
                        "Student registration error:",
                        err.message
                    );

                    return res.status(500).json({
                        message:
                            "حدث خطأ أثناء التسجيل"
                    });

                }

                res.json({
                    message:
                        "تم التسجيل بنجاح"
                });

            }
        );

    } catch (error) {

        console.error(
            "Student registration error:",
            error
        );

        res.status(500).json({
            message:
                "حدث خطأ في السيرفر"
        });

    }

});

// =========================
// تسجيل الشركة
// =========================

app.post("/company-register", async (req, res) => {

    const {
        name,
        companyName,
        email,
        password,
        field,
        location,
        description
    } = req.body;

    const finalCompanyName =
        name || companyName;

    if (
        !finalCompanyName ||
        !email ||
        !password ||
        !field ||
        !location ||
        !description
    ) {

        return res.status(400).json({
            message:
                "من فضلك املأ البيانات المطلوبة"
        });

    }

    try {

        const hashedPassword =
            await bcrypt.hash(password, 10);

        db.run(
            `
            INSERT INTO companies
            (
                name,
                company_name,
                email,
                password,
                field,
                location,
                description
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                finalCompanyName,
                finalCompanyName,
                email,
                hashedPassword,
                field,
                location,
                description
            ],
            function(err) {

                if (err) {

                    if (err.message.includes("UNIQUE")) {

                        return res.status(400).json({
                            message:
                                "البريد الإلكتروني مستخدم بالفعل"
                        });

                    }

                    console.error(
                        "Company registration error:",
                        err.message
                    );

                    return res.status(500).json({
                        message:
                            "حدث خطأ أثناء تسجيل الشركة"
                    });

                }

                res.json({
                    message:
                        "تم تسجيل الشركة بنجاح"
                });

            }
        );

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message:
                "حدث خطأ في السيرفر"
        });

    }

});
// =========================
// دخول الطالب
// =========================

app.post("/login", (req, res) => {

    const {
        email,
        password
    } = req.body;

    db.get(
        `
        SELECT *
        FROM users
        WHERE email = ?
        `,
        [email],
        async (err, user) => {

            if (err) {

                return res.status(500).json({
                    message:
                        "حدث خطأ في السيرفر"
                });

            }

            if (!user) {

                return res.status(401).json({
                    message:
                        "البريد الإلكتروني أو كلمة المرور غير صحيحة"
                });

            }

            const validPassword =
                await bcrypt.compare(
                    password,
                    user.password
                );

            if (!validPassword) {

                return res.status(401).json({
                    message:
                        "البريد الإلكتروني أو كلمة المرور غير صحيحة"
                });

            }

            res.json({

                message:
                    "تم تسجيل الدخول بنجاح",

                user: {
                    name: user.name,
                    email: user.email
                }

            });

        }
    );

});


// =========================
// ⭐ نسيت كلمة المرور
// =========================

app.post("/reset-password", async (req, res) => {

    const {
        email,
        newPassword
    } = req.body;

    if (!email || !newPassword) {

        return res.status(400).json({
            message:
                "من فضلك املأ البريد الإلكتروني وكلمة المرور الجديدة"
        });

    }

    if (newPassword.length < 6) {

        return res.status(400).json({
            message:
                "كلمة المرور لازم تكون 6 أحرف أو أرقام على الأقل"
        });

    }

    try {

        const hashedPassword =
            await bcrypt.hash(newPassword, 10);

        db.run(
            `
            UPDATE users
            SET password = ?
            WHERE email = ?
            `,
            [
                hashedPassword,
                email
            ],
            function(err) {

                if (err) {

                    console.error(
                        "Reset password error:",
                        err.message
                    );

                    return res.status(500).json({
                        message:
                            "حدث خطأ أثناء تغيير كلمة المرور"
                    });

                }

                if (this.changes === 0) {

                    return res.status(404).json({
                        message:
                            "البريد الإلكتروني غير مسجل"
                    });

                }

                res.json({
                    message:
                        "تم تغيير كلمة المرور بنجاح"
                });

            }
        );

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message:
                "حدث خطأ في السيرفر"
        });

    }

});


// =========================
// دخول الشركة
// =========================

app.post("/company-login", (req, res) => {

    const {
        email,
        password
    } = req.body;

    db.get(
        `
        SELECT *
        FROM companies
        WHERE email = ?
        `,
        [email],
        async (err, company) => {

            if (err) {

                return res.status(500).json({
                    message:
                        "حدث خطأ في السيرفر"
                });

            }

            if (!company) {

                return res.status(401).json({
                    message:
                        "البريد الإلكتروني أو كلمة المرور غير صحيحة"
                });

            }

            const validPassword =
                await bcrypt.compare(
                    password,
                    company.password
                );

            if (!validPassword) {

                return res.status(401).json({
                    message:
                        "البريد الإلكتروني أو كلمة المرور غير صحيحة"
                });

            }

            res.json({

                message:
                    "تم تسجيل الدخول بنجاح",

                company: {
                    name: company.name,
                    email: company.email
                }

            });

        }
    );

});


// =========================
// بيانات الطالب
// =========================

app.get("/profile", (req, res) => {

    const email = req.query.email;

    db.get(
        `
        SELECT
            id,
            name,
            email
        FROM users
        WHERE email = ?
        `,
        [email],
        (err, user) => {

            if (err) {

                return res.status(500).json({
                    message:
                        "حدث خطأ في السيرفر"
                });

            }

            if (!user) {

                return res.status(404).json({
                    message:
                        "الطالب غير موجود"
                });

            }

            res.json(user);

        }
    );

});


// =========================
// ⭐ تعديل بيانات الطالب
// =========================

app.put("/update-profile", (req, res) => {

    const {
        oldEmail,
        name,
        email
    } = req.body;

    if (!oldEmail || !name || !email) {

        return res.status(400).json({
            message:
                "من فضلك املأ جميع البيانات"
        });

    }

    db.get(
        `
        SELECT
            id
        FROM users
        WHERE email = ?
        `,
        [oldEmail],
        (err, user) => {

            if (err) {

                return res.status(500).json({
                    message:
                        "حدث خطأ في السيرفر"
                });

            }

            if (!user) {

                return res.status(404).json({
                    message:
                        "الطالب غير موجود"
                });

            }

            db.get(
                `
                SELECT
                    id
                FROM users
                WHERE email = ?
                AND id != ?
                `,
                [
                    email,
                    user.id
                ],
                (err, existingUser) => {

                    if (err) {

                        return res.status(500).json({
                            message:
                                "حدث خطأ في السيرفر"
                        });

                    }

                    if (existingUser) {

                        return res.status(400).json({
                            message:
                                "البريد الإلكتروني مستخدم بالفعل"
                        });

                    }

                    db.run(
                        `
                        UPDATE users
                        SET
                            name = ?,
                            email = ?
                        WHERE id = ?
                        `,
                        [
                            name,
                            email,
                            user.id
                        ],
                        function(err) {

                            if (err) {

                                console.error(
                                    "Update profile error:",
                                    err.message
                                );

                                return res.status(500).json({
                                    message:
                                        "حدث خطأ أثناء تحديث البيانات"
                                });

                            }

                            res.json({

                                message:
                                    "تم تحديث البيانات بنجاح",

                                user: {
                                    name: name,
                                    email: email
                                }

                            });

                        }
                    );

                }
            );

        }
    );

});


// =========================
// بيانات الشركة
// =========================

app.get("/company-profile", (req, res) => {

    const email = req.query.email;

    db.get(
        `
        SELECT
            id,
            name,
            email,
            field,
            location,
            description
        FROM companies
        WHERE email = ?
        `,
        [email],
        (err, company) => {

            if (err) {

                return res.status(500).json({
                    message:
                        "حدث خطأ في السيرفر"
                });

            }

            if (!company) {

                return res.status(404).json({
                    message:
                        "الشركة غير موجودة"
                });

            }

            res.json(company);

        }
    );

});


// =========================
// إضافة فرصة
// =========================

app.post("/opportunities", (req, res) => {

    const {
        companyEmail,
        title,
        type,
        field,
        location,
        description,
        skills,
        deadline
    } = req.body;

    if (
        !companyEmail ||
        !title ||
        !type ||
        !field ||
        !location ||
        !description ||
        !deadline
    ) {

        return res.status(400).json({
            message:
                "من فضلك املأ جميع البيانات المطلوبة"
        });

    }

    db.run(
        `
        INSERT INTO opportunities
        (
            company_email,
            title,
            type,
            field,
            location,
            description,
            skills,
            deadline
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            companyEmail,
            title,
            type,
            field,
            location,
            description,
            skills || "",
            deadline
        ],
        function(err) {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    message:
                        "حدث خطأ أثناء إضافة الفرصة"
                });

            }

            res.json({

                message:
                    "تمت إضافة الفرصة بنجاح",

                id: this.lastID

            });

        }

    );

});


// =========================
// فرص شركة معينة
// =========================

app.get("/company-opportunities", (req, res) => {

    const email = req.query.email;

    db.all(
        `
        SELECT *
        FROM opportunities
        WHERE company_email = ?
        ORDER BY id DESC
        `,
        [email],
        (err, opportunities) => {

            if (err) {

                return res.status(500).json({
                    message:
                        "حدث خطأ في السيرفر"
                });

            }

            res.json(opportunities);

        }
    );

});


// =========================
// كل الفرص
// =========================

app.get("/all-opportunities", (req, res) => {

    db.all(
        `
        SELECT *
        FROM opportunities
        ORDER BY id DESC
        `,
        [],
        (err, opportunities) => {

            if (err) {

                return res.status(500).json({
                    message:
                        "حدث خطأ في السيرفر"
                });

            }

            res.json(opportunities);

        }
    );

});


// =========================
// فرصة واحدة
// =========================

app.get("/opportunity", (req, res) => {

    const id = req.query.id;

    db.get(
        `
        SELECT *
        FROM opportunities
        WHERE id = ?
        `,
        [id],
        (err, opportunity) => {

            if (err) {

                return res.status(500).json({
                    message:
                        "حدث خطأ في السيرفر"
                });

            }

            if (!opportunity) {

                return res.status(404).json({
                    message:
                        "الفرصة غير موجودة"
                });

            }

            res.json(opportunity);

        }
    );

});


// =========================
// تعديل فرصة
// =========================

app.put("/opportunity/:id", (req, res) => {

    const id = req.params.id;

    const {
        title,
        type,
        field,
        location,
        description,
        skills,
        deadline,
        companyEmail
    } = req.body;

    db.run(
        `
        UPDATE opportunities
        SET
            title = ?,
            type = ?,
            field = ?,
            location = ?,
            description = ?,
            skills = ?,
            deadline = ?
        WHERE id = ?
        AND company_email = ?
        `,
        [
            title,
            type,
            field,
            location,
            description,
            skills,
            deadline,
            id,
            companyEmail
        ],
        function(err) {

            if (err) {

                return res.status(500).json({
                    message:
                        "حدث خطأ أثناء تعديل الفرصة"
                });

            }

            if (this.changes === 0) {

                return res.status(404).json({
                    message:
                        "لم يتم العثور على الفرصة"
                });

            }

            res.json({
                message:
                    "تم تعديل الفرصة بنجاح"
            });

        }
    );

});


// =========================
// حذف فرصة
// =========================

app.delete("/opportunity/:id", (req, res) => {

    const id = req.params.id;

    db.run(
        `
        DELETE FROM opportunities
        WHERE id = ?
        `,
        [id],
        function(err) {

            if (err) {

                return res.status(500).json({
                    message:
                        "حدث خطأ أثناء حذف الفرصة"
                });

            }

            if (this.changes === 0) {

                return res.status(404).json({
                    message:
                        "الفرصة غير موجودة"
                });

            }

            res.json({
                message:
                    "تم حذف الفرصة بنجاح"
            });

        }
    );

});


// =========================
// التقديم على فرصة
// =========================

app.post("/apply", (req, res) => {

    const {
        userEmail,
        opportunityId,
        opportunityName
    } = req.body;

    if (
        !userEmail ||
        !opportunityId ||
        !opportunityName
    ) {

        return res.status(400).json({
            message:
                "بيانات التقديم غير مكتملة"
        });

    }

    db.get(
        `
        SELECT id
        FROM applications
        WHERE user_email = ?
        AND opportunity_id = ?
        `,
        [
            userEmail,
            String(opportunityId)
        ],
        (err, existing) => {

            if (err) {

                return res.status(500).json({
                    message:
                        "حدث خطأ في السيرفر"
                });

            }

            if (existing) {

                return res.status(400).json({
                    message:
                        "أنت قدمت على هذه الفرصة بالفعل"
                });

            }

            db.run(
                `
                INSERT INTO applications
                (
                    user_email,
                    opportunity_id,
                    opportunity_name,
                    status
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    userEmail,
                    String(opportunityId),
                    opportunityName,
                    "قيد المراجعة"
                ],
                function(err) {

                    if (err) {

                        console.error(err);

                        return res.status(500).json({
                            message:
                                "حدث خطأ أثناء التقديم"
                        });

                    }

                    res.json({
                        message:
                            "تم التقديم بنجاح"
                    });

                }
            );

        }
    );

});


// =========================
// تقديمات الطالب
// =========================

app.get("/applications", (req, res) => {

    const email = req.query.email;

    db.all(
        `
        SELECT
            id,
            opportunity_id,
            opportunity_name,
            status,
            created_at
        FROM applications
        WHERE user_email = ?
        ORDER BY id DESC
        `,
        [email],
        (err, applications) => {

            if (err) {

                return res.status(500).json({
                    message:
                        "حدث خطأ في السيرفر"
                });

            }

            res.json(applications);

        }
    );

});


// =========================
// المتقدمون للشركة
// =========================

app.get("/company-applications", (req, res) => {

    const companyEmail = req.query.email;

    if (!companyEmail) {

        return res.status(400).json({
            message:
                "بريد الشركة غير موجود"
        });

    }

    const query = `
        SELECT
            a.id,
            a.user_email,
            a.opportunity_id,
            a.opportunity_name,
            a.status,
            a.created_at,

            u.name AS student_name,

            o.title AS opportunity_title,
            o.type AS opportunity_type,
            o.field AS opportunity_field,
            o.location AS opportunity_location

        FROM applications a

        LEFT JOIN users u
            ON u.email = a.user_email

        LEFT JOIN opportunities o
            ON CAST(a.opportunity_id AS INTEGER) = o.id

        WHERE o.company_email = ?

        ORDER BY a.id DESC
    `;

    db.all(
        query,
        [companyEmail],
        (err, applications) => {

            if (err) {

                console.error(
                    "Company applications error:",
                    err.message
                );

                return res.status(500).json({
                    message:
                        "حدث خطأ أثناء تحميل المتقدمين"
                });

            }

            res.json({
                applications: applications
            });

        }
    );

});

// =========================
// تغيير حالة طلب التقديم
// =========================

app.put("/application-status", (req, res) => {

    const {
        applicationId,
        status
    } = req.body;

    if (!applicationId || !status) {

        return res.status(400).json({
            message:
                "بيانات الطلب غير مكتملة"
        });

    }

    // القيم التي ترسلها صفحة الشركة
    const allowedStatuses = [
        "accepted",
        "rejected"
    ];

    if (!allowedStatuses.includes(status)) {

        return res.status(400).json({
            message:
                "حالة غير صحيحة"
        });

    }

    db.run(
        `
        UPDATE applications
        SET status = ?
        WHERE id = ?
        `,
        [
            status,
            applicationId
        ],
        function(err) {

            if (err) {

                console.error(
                    "Application status error:",
                    err.message
                );

                return res.status(500).json({
                    message:
                        "حدث خطأ أثناء تحديث الحالة"
                });

            }

            if (this.changes === 0) {

                return res.status(404).json({
                    message:
                        "طلب التقديم غير موجود"
                });

            }

            res.json({
                message:
                    "تم تحديث حالة الطلب بنجاح"
            });

        }
    );

});


// =====================================================
// ⭐ المطابقة الذكية
// =====================================================


// =========================
// حفظ مهارات الطالب
// =========================

app.post("/user-skills", (req, res) => {

    const userEmail =
        req.body.userEmail ||
        req.body.email;

    const skills =
        typeof req.body.skills === "string"
            ? req.body.skills.trim()
            : req.body.skills;

    if (!userEmail || !skills) {

        return res.status(400).json({
            message:
                "البريد الإلكتروني والمهارات مطلوبان"
        });

    }

    db.run(
        `
        INSERT INTO user_skills
        (user_email, skills)
        VALUES (?, ?)

        ON CONFLICT(user_email)
        DO UPDATE SET
            skills = excluded.skills
        `,
        [
            userEmail,
            skills
        ],
        function(err) {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    message:
                        "حدث خطأ أثناء حفظ المهارات"
                });

            }

            res.json({
                message:
                    "تم حفظ مهاراتك بنجاح"
            });

        }

    );

});


// =========================
// حفظ بيانات المطابقة
// =========================

app.post("/matching-profile", (req, res) => {

    const userEmail =
        req.body.userEmail ||
        req.body.email;

    const {
        field,
        location,
        preferredType,
        experience,
        projects
    } = req.body;

    if (!userEmail) {

        return res.status(400).json({
            message:
                "البريد الإلكتروني مطلوب"
        });

    }

    db.run(
        `
        INSERT INTO user_matching_profile
        (
            user_email,
            field,
            location,
            preferred_type,
            experience,
            projects
        )
        VALUES (?, ?, ?, ?, ?, ?)

        ON CONFLICT(user_email)
        DO UPDATE SET
            field = excluded.field,
            location = excluded.location,
            preferred_type = excluded.preferred_type,
            experience = excluded.experience,
            projects = excluded.projects
        `,
        [
            userEmail,
            field || "",
            location || "",
            preferredType || "",
            experience || "",
            projects || ""
        ],
        function(err) {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    message:
                        "حدث خطأ أثناء حفظ بيانات المطابقة"
                });

            }

            res.json({
                message:
                    "تم حفظ بيانات المطابقة بنجاح"
            });

        }

    );

});


// =========================
// جلب بيانات المطابقة
// =========================

app.get("/matching-profile", (req, res) => {

    const email = req.query.email;

    if (!email) {

        return res.status(400).json({
            message:
                "البريد الإلكتروني مطلوب"
        });

    }

    db.get(
        `
        SELECT *
        FROM user_matching_profile
        WHERE user_email = ?
        `,
        [email],
        (err, profile) => {

            if (err) {

                return res.status(500).json({
                    message:
                        "حدث خطأ في السيرفر"
                });

            }

            res.json(
                profile || {
                    user_email: email,
                    field: "",
                    location: "",
                    preferred_type: "",
                    experience: "",
                    projects: ""
                }
            );

        }
    );

});


// =========================
// جلب مهارات الطالب
// =========================

app.get("/user-skills", (req, res) => {

    const email = req.query.email;

    if (!email) {

        return res.status(400).json({
            message:
                "البريد الإلكتروني مطلوب"
        });

    }

    db.get(
        `
        SELECT
            user_email,
            skills
        FROM user_skills
        WHERE user_email = ?
        `,
        [email],
        (err, data) => {

            if (err) {

                return res.status(500).json({
                    message:
                        "حدث خطأ في السيرفر"
                });

            }

            res.json(
                data || {
                    user_email: email,
                    skills: ""
                }
            );

        }
    );

});


// =====================================================
// ⭐ بيانات الطالب الكاملة للمطابقة الذكية
// =====================================================

app.get("/student-matching-data", (req, res) => {

    const email = req.query.email;

    if (!email) {

        return res.status(400).json({
            message:
                "البريد الإلكتروني مطلوب"
        });

    }

    db.get(
        `
        SELECT
            u.id,
            u.name,
            u.email,

            mp.field,
            mp.location,
            mp.preferred_type,
            mp.experience,
            mp.projects,

            us.skills

        FROM users u

        LEFT JOIN user_matching_profile mp
            ON mp.user_email = u.email

        LEFT JOIN user_skills us
            ON us.user_email = u.email

        WHERE u.email = ?
        `,
        [email],
        (err, student) => {

            if (err) {

                console.error(err);

                return res.status(500).json({
                    message:
                        "حدث خطأ أثناء تحميل بيانات الطالب"
                });

            }

            if (!student) {

                return res.status(404).json({
                    message:
                        "الطالب غير موجود"
                });

            }

            res.json({

                name: student.name || "",
                email: student.email || "",

                field: student.field || "",
                location: student.location || "",
                preferredType:
                    student.preferred_type || "",

                experience:
                    student.experience || "",

                projects:
                    student.projects || "",

                skills:
                    student.skills || ""

            });

        }
    );

});


// =====================================================
// ⭐⭐⭐ محرك المطابقة الذكية ⭐⭐⭐
// =====================================================

function smartMatchesHandler(req, res) {

    const email =
        req.query.email ||
        (req.body && (req.body.email || req.body.userEmail));

    if (!email) {

        return res.status(400).json({
            message:
                "البريد الإلكتروني مطلوب"
        });

    }

    db.get(
        `
        SELECT
            field,
            location,
            preferred_type,
            experience,
            projects
        FROM user_matching_profile
        WHERE user_email = ?
        `,
        [email],
        (err, profile) => {

            if (err) {

                console.error(
                    "Smart matching profile error:",
                    err.message
                );

                return res.status(500).json({
                    message:
                        "حدث خطأ أثناء تحميل بيانات الطالب"
                });

            }

            db.get(
                `
                SELECT skills
                FROM user_skills
                WHERE user_email = ?
                `,
                [email],
                (err, skillData) => {

                    if (err) {

                        console.error(
                            "Smart matching skills error:",
                            err.message
                        );

                        return res.status(500).json({
                            message:
                                "حدث خطأ أثناء تحميل مهارات الطالب"
                        });

                    }

                    const studentProfile =
                        profile || {};

                    const studentSkills =
                        (skillData?.skills || "")
                        .toLowerCase()
                        .split(/[،,;]+/)
                        .map(s => s.trim())
                        .filter(Boolean);

                    const studentField =
                        (
                            studentProfile.field ||
                            ""
                        )
                        .toLowerCase()
                        .trim();

                    const studentLocation =
                        (
                            studentProfile.location ||
                            ""
                        )
                        .toLowerCase()
                        .trim();

                    const preferredType =
                        (
                            studentProfile.preferred_type ||
                            ""
                        )
                        .toLowerCase()
                        .trim();

                    const studentExperience =
                        (
                            studentProfile.experience ||
                            ""
                        )
                        .toLowerCase()
                        .trim();

                    const studentProjects =
                        (
                            studentProfile.projects ||
                            ""
                        )
                        .toLowerCase()
                        .trim();


                    // =====================================================
                    // جلب الفرص والشركات بشكل منفصل
                    // =====================================================

                    db.all(
                        `
                        SELECT *
                        FROM opportunities
                        ORDER BY id DESC
                        `,
                        [],
                        (err, opportunities) => {

                            if (err) {

                                console.error(
                                    "Smart matching opportunities error:",
                                    err.message
                                );

                                return res.status(500).json({
                                    message:
                                        "حدث خطأ أثناء تحميل الفرص"
                                });

                            }

                            db.all(
                                `
                                SELECT *
                                FROM companies
                                `,
                                [],
                                (companyErr, companies) => {

                                    if (companyErr) {

                                        console.error(
                                            "Smart matching companies error:",
                                            companyErr.message
                                        );

                                        return res.status(500).json({
                                            message:
                                                "حدث خطأ أثناء تحميل بيانات الشركات"
                                        });

                                    }


                                    // =========================
                                    // ربط الشركات بالإيميل
                                    // مع تجاهل المسافات وحالة الحروف
                                    // =========================

                                    const companyMap = {};

                                    companies.forEach(
                                        company => {

                                            const companyEmail =
                                                String(
                                                    company.email || ""
                                                )
                                                .trim()
                                                .toLowerCase();

                                            if (companyEmail) {

                                                companyMap[
                                                    companyEmail
                                                ] = company;

                                            }

                                        }
                                    );


                                    opportunities =
                                        opportunities.map(
                                            opportunity => {

                                                const opportunityEmail =
                                                    String(
                                                        opportunity.company_email || ""
                                                    )
                                                    .trim()
                                                    .toLowerCase();

                                                const company =
                                                    companyMap[
                                                        opportunityEmail
                                                    ];


                                                return {

                                                    ...opportunity,

                                                    company_name:
                                                        company
                                                            ? (
                                                                company.name ||
                                                                company.company_name ||
                                                                company.companyName ||
                                                                company.email ||
                                                                "شركة"
                                                            )
                                                            : (
                                                                opportunity.company_email ||
                                                                "شركة"
                                                            )

                                                };

                                            }
                                        );


                                    const matches =
                                        opportunities.map(
                                            opportunity => {

                                                let score = 0;

                                                const reasons = [];
                                                const missingSkills = [];
                                                const matchedSkills = [];


                                                // =========================
                                                // المجال - 30%
                                                // =========================

                                                const opportunityField =
                                                    (
                                                        opportunity.field ||
                                                        ""
                                                    )
                                                    .toLowerCase()
                                                    .trim();

                                                if (
                                                    studentField &&
                                                    opportunityField &&
                                                    (
                                                        studentField.includes(
                                                            opportunityField
                                                        ) ||
                                                        opportunityField.includes(
                                                            studentField
                                                        )
                                                    )
                                                ) {

                                                    score += 30;

                                                    reasons.push(
                                                        "مجالك مناسب للفرصة"
                                                    );

                                                }


                                                // =========================
                                                // المهارات - 40%
                                                // =========================

                                                const opportunitySkills =
                                                    (
                                                        opportunity.skills ||
                                                        ""
                                                    )
                                                    .toLowerCase()
                                                    .split(/[،,;]+/)
                                                    .map(s => s.trim())
                                                    .filter(Boolean);


                                                opportunitySkills.forEach(
                                                    opportunitySkill => {

                                                        let found = false;

                                                        studentSkills.forEach(
                                                            studentSkill => {

                                                                if (
                                                                    studentSkill.includes(
                                                                        opportunitySkill
                                                                    ) ||
                                                                    opportunitySkill.includes(
                                                                        studentSkill
                                                                    )
                                                                ) {

                                                                    found = true;

                                                                    if (
                                                                        !matchedSkills.includes(
                                                                            opportunitySkill
                                                                        )
                                                                    ) {

                                                                        matchedSkills.push(
                                                                            opportunitySkill
                                                                        );

                                                                    }

                                                                }

                                                            }
                                                        );


                                                        if (!found) {

                                                            missingSkills.push(
                                                                opportunitySkill
                                                            );

                                                        }

                                                    }
                                                );


                                                if (
                                                    opportunitySkills.length > 0
                                                ) {

                                                    const skillPercentage =
                                                        matchedSkills.length /
                                                        opportunitySkills.length;

                                                    score += Math.round(
                                                        skillPercentage * 40
                                                    );

                                                    if (
                                                        matchedSkills.length > 0
                                                    ) {

                                                        reasons.push(
                                                            `لديك ${matchedSkills.length} من مهارات الفرصة المطلوبة`
                                                        );

                                                    }

                                                }


                                                // =========================
                                                // الموقع - 15%
                                                // =========================

                                                const opportunityLocation =
                                                    (
                                                        opportunity.location ||
                                                        ""
                                                    )
                                                    .toLowerCase()
                                                    .trim();

                                                if (
                                                    studentLocation &&
                                                    opportunityLocation &&
                                                    (
                                                        studentLocation.includes(
                                                            opportunityLocation
                                                        ) ||
                                                        opportunityLocation.includes(
                                                            studentLocation
                                                        )
                                                    )
                                                ) {

                                                    score += 15;

                                                    reasons.push(
                                                        "الموقع مناسب لك"
                                                    );

                                                }


                                                // =========================
                                                // نوع الفرصة - 10%
                                                // =========================

                                                const opportunityType =
                                                    (
                                                        opportunity.type ||
                                                        ""
                                                    )
                                                    .toLowerCase()
                                                    .trim();

                                                if (
                                                    preferredType &&
                                                    opportunityType &&
                                                    (
                                                        preferredType.includes(
                                                            opportunityType
                                                        ) ||
                                                        opportunityType.includes(
                                                            preferredType
                                                        )
                                                    )
                                                ) {

                                                    score += 10;

                                                    reasons.push(
                                                        "نوع الفرصة مناسب لتفضيلاتك"
                                                    );

                                                }


                                                // =========================
                                                // الخبرة والمشاريع - 5%
                                                // =========================

                                                if (
                                                    studentExperience ||
                                                    studentProjects
                                                ) {

                                                    const opportunityText = `
                                                        ${opportunity.description || ""}
                                                        ${opportunity.skills || ""}
                                                        ${opportunity.title || ""}
                                                    `.toLowerCase();

                                                    let experienceMatch = false;

                                                    const experienceWords =
                                                        studentExperience
                                                            .split(/[،,; ]+/)
                                                            .filter(Boolean);

                                                    const projectWords =
                                                        studentProjects
                                                            .split(/[،,; ]+/)
                                                            .filter(Boolean);

                                                    const allWords = [
                                                        ...experienceWords,
                                                        ...projectWords
                                                    ];

                                                    allWords.forEach(
                                                        word => {

                                                            if (
                                                                word.length >= 3 &&
                                                                opportunityText.includes(
                                                                    word
                                                                )
                                                            ) {

                                                                experienceMatch =
                                                                    true;

                                                            }

                                                        }
                                                    );

                                                    if (
                                                        experienceMatch
                                                    ) {

                                                        score += 5;

                                                        reasons.push(
                                                            "خبراتك أو مشاريعك مرتبطة بالفرصة"
                                                        );

                                                    }

                                                }


                                                // =========================
                                                // النتيجة النهائية
                                                // =========================

                                                if (score > 100) {
                                                    score = 100;
                                                }


                                                let matchLevel =
                                                    "ضعيف";

                                                if (score >= 80) {

                                                    matchLevel =
                                                        "تطابق قوي";

                                                } else if (score >= 60) {

                                                    matchLevel =
                                                        "تطابق جيد";

                                                } else if (score >= 40) {

                                                    matchLevel =
                                                        "تطابق متوسط";

                                                }


                                                return {

                                                    ...opportunity,

                                                    matchPercentage:
                                                        score,

                                                    matchLevel,

                                                    matchedSkills,

                                                    missingSkills,

                                                    reasons

                                                };

                                            }
                                        );


                                    matches.sort(
                                        (a, b) =>
                                            b.matchPercentage -
                                            a.matchPercentage
                                    );


                                    res.json(matches);

                                }
                            );

                        }
                    );

                }
            );

        }
    );

}


// =========================
// GET + POST للمطابقة الذكية
// =========================

app.get(
    "/smart-matches",
    smartMatchesHandler
);

app.post(
    "/smart-matches",
    smartMatchesHandler
);


// =========================
// تشغيل السيرفر
// =========================

app.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );

});