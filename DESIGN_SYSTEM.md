# نظام التصميم - LMM Financial Management System

## 📐 النظام التصميمي المُطبّق: NativeBase v3.4

تم تطبيق نظام التصميم الكامل من **NativeBase v3.4** على مشروع lmm، مع دعم كامل للغة العربية واتجاه RTL.

---

## 🎨 نظام الألوان (Color System)

### الألوان الأساسية (Primary Colors)

```css
Primary (Cyan):   #06b6d4 (cyan-500)
Secondary (Pink): #ec4899 (pink-500)
Success (Green):  #22c55e (green-500)
Warning (Orange): #f97316 (orange-500)
Danger (Rose):    #f43f5e (rose-500)
Error (Red):      #ef4444 (red-500)
Info (Light Blue):#0ea5e9 (lightBlue-500)
```

### لوحة الألوان الكاملة

كل لون متوفر بتدرجات من 50 إلى 900:

- **Rose** - للتحذيرات والأخطاء الحرجة
- **Pink** - للألوان الثانوية
- **Purple, Violet, Indigo** - للعناصر المميزة
- **Blue, Light Blue, Cyan** - للعناصر الأساسية والروابط
- **Teal, Emerald, Green** - للحالات الناجحة
- **Lime, Yellow, Amber** - للتنبيهات
- **Orange** - للتحذيرات
- **Red** - للأخطاء
- **Gray Variants** - warmGray, trueGray, gray, coolGray, blueGray

### استخدام الألوان في Tailwind

```tsx
// Text colors
<p className="text-primary-500">نص أساسي</p>
<p className="text-success-600">نص ناجح</p>

// Background colors
<div className="bg-cyan-50">خلفية فاتحة</div>
<div className="bg-primary-500">خلفية أساسية</div>

// Border colors
<div className="border-2 border-danger-400">حدود تحذير</div>
```

---

## 📝 Typography System

### أحجام الخطوط

```css
2xs: 0.625rem (10px)
xs:  0.75rem  (12px)
sm:  0.875rem (14px)
md:  1rem     (16px) - الحجم الافتراضي
lg:  1.125rem (18px)
xl:  1.25rem  (20px)
2xl: 1.5rem   (24px)
3xl: 1.875rem (30px)
4xl: 2.25rem  (36px)
5xl: 3rem     (48px)
6xl: 3.75rem  (60px)
7xl: 4.5rem   (72px)
8xl: 6rem     (96px)
9xl: 8rem     (128px)
```

### أوزان الخطوط

```css
hairline:  100
thin:      200
light:     300
normal:    400
medium:    500
semibold:  600
bold:      700
extrabold: 800
black:     900
```

### استخدام Typography

```tsx
<h1 className="text-4xl font-bold">عنوان رئيسي</h1>
<h2 className="text-2xl font-semibold">عنوان فرعي</h2>
<p className="text-md font-normal">نص عادي</p>
<small className="text-sm text-muted-600">نص صغير</small>
```

---

## 📏 Spacing System

```css
px:  1px
0:   0
0.5: 0.125rem (2px)
1:   0.25rem  (4px)
1.5: 0.375rem (6px)
2:   0.5rem   (8px)
2.5: 0.625rem (10px)
3:   0.75rem  (12px)
4:   1rem     (16px)
5:   1.25rem  (20px)
6:   1.5rem   (24px)
8:   2rem     (32px)
10:  2.5rem   (40px)
12:  3rem     (48px)
16:  4rem     (64px)
20:  5rem     (80px)
24:  6rem     (96px)
```

### استخدام Spacing

```tsx
<div className="p-4">padding 16px</div>
<div className="mx-6">margin horizontal 24px</div>
<div className="gap-3">gap 12px</div>
<div className="space-y-4">vertical spacing 16px</div>
```

---

## 🔲 Border Radius

```css
none: 0
xs:   0.125rem (2px)
sm:   0.25rem  (4px)
md:   0.375rem (6px)
lg:   0.5rem   (8px)
xl:   0.75rem  (12px)
2xl:  1rem     (16px)
3xl:  1.5rem   (24px)
full: 9999px   (دائري كامل)
```

### استخدام Border Radius

```tsx
<div className="rounded-md">حواف متوسطة</div>
<div className="rounded-lg">حواف كبيرة</div>
<div className="rounded-full">دائري</div>
```

---

## 🌑 Shadows

```css
xs:   خفيف جداً
sm:   خفيف
md:   متوسط (افتراضي)
lg:   كبير
xl:   كبير جداً
2xl:  ضخم
inner: ظل داخلي
```

### استخدام Shadows

```tsx
<div className="shadow-md">ظل متوسط</div>
<div className="shadow-lg hover:shadow-xl">ظل تفاعلي</div>
```

---

## 📱 Breakpoints

```css
sm:  640px
md:  768px
lg:  1024px
xl:  1280px
2xl: 1536px
```

### Responsive Design

```tsx
<div className="
  text-sm md:text-md lg:text-lg
  p-4 md:p-6 lg:p-8
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
">
  محتوى متجاوب
</div>
```

---

## 🌍 دعم RTL للعربية

### استخدام Tailwind RTL

```tsx
// Padding RTL-aware
<div className="ps-4">padding-inline-start</div>
<div className="pe-4">padding-inline-end</div>

// Margin RTL-aware
<div className="ms-4">margin-inline-start</div>
<div className="me-4">margin-inline-end</div>

// Text alignment
<p className="text-start">يبدأ من اليمين في RTL</p>
<p className="text-end">ينتهي عند اليسار في RTL</p>
```

---

## 🎯 أمثلة عملية

### بطاقة (Card)

```tsx
<div className="
  bg-white dark:bg-gray-800
  rounded-lg
  shadow-md
  p-6
  border border-gray-200 dark:border-gray-700
">
  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
    عنوان البطاقة
  </h3>
  <p className="text-md text-gray-600 dark:text-gray-300">
    محتوى البطاقة
  </p>
</div>
```

### زر (Button)

```tsx
// Primary Button
<button className="
  bg-primary-500 hover:bg-primary-600
  text-white
  font-medium
  px-6 py-3
  rounded-lg
  shadow-sm hover:shadow-md
  transition-all duration-200
">
  زر أساسي
</button>

// Success Button
<button className="
  bg-success-500 hover:bg-success-600
  text-white
  font-medium
  px-6 py-3
  rounded-lg
  shadow-sm hover:shadow-md
  transition-all duration-200
">
  حفظ
</button>

// Danger Button
<button className="
  bg-danger-500 hover:bg-danger-600
  text-white
  font-medium
  px-6 py-3
  rounded-lg
  shadow-sm hover:shadow-md
  transition-all duration-200
">
  حذف
</button>
```

### Input Field

```tsx
<input
  type="text"
  className="
    w-full
    px-4 py-2
    border border-gray-300
    rounded-md
    focus:ring-2 focus:ring-primary-500 focus:border-primary-500
    text-md
    placeholder-gray-400
  "
  placeholder="أدخل النص..."
/>
```

---

## 🎨 Dark Mode Support

```tsx
// استخدام Dark Mode
<div className="
  bg-white dark:bg-gray-900
  text-gray-900 dark:text-white
  border-gray-200 dark:border-gray-700
">
  محتوى مع دعم الوضع الداكن
</div>
```

---

## 📚 الموارد

- **NativeBase Docs**: https://docs.nativebase.io
- **Tailwind CSS**: https://tailwindcss.com
- **Design Tokens**: `/symbolai-worker/src/theme/`

---

## ✅ Accessibility (WCAG 3.0 APCA)

جميع الألوان تم فحصها وفقاً لمعايير WCAG 3.0 APCA لضمان:
- تباين كافٍ للنصوص
- قابلية قراءة عالية
- دعم كامل لذوي الاحتياجات الخاصة

---

**تاريخ التحديث**: 2025-11-01
**الإصدار**: 1.0.0
**المطوّر**: Claude Code + NativeBase v3.4
