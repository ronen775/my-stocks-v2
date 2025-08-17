# הגדרת Firebase עבור רישום וכניסה

## שלב 1: יצירת פרויקט Firebase

1. לך ל-[Firebase Console](https://console.firebase.google.com/)
2. לחץ על "Create a project" או "צור פרויקט"
3. תן שם לפרויקט (למשל: "מחשבון-מניות")
4. עקוב אחר השלבים ליצירת הפרויקט

## שלב 2: הגדרת Authentication

1. בפרויקט Firebase, לך ל-"Authentication" בתפריט הצד
2. לחץ על "Get started" או "התחל"
3. בחר ב-"Sign-in method" או "שיטת כניסה"
4. הפעל את "Google" כשיטת כניסה
5. הוסף את הדומיין שלך (localhost:5173 לפיתוח)

## שלב 3: הגדרת Firestore Database

1. בפרויקט Firebase, לך ל-"Firestore Database"
2. לחץ על "Create database"
3. בחר "Start in test mode" (לפיתוח)
4. בחר מיקום לשרת (למשל: us-central1)

## שלב 4: קבלת פרטי הקונפיגורציה

1. בפרויקט Firebase, לך ל-"Project settings" (הגלגל שיניים)
2. בחר ב-"General" tab
3. גלול למטה ל-"Your apps"
4. לחץ על סמל ה-web (</>) כדי להוסיף אפליקציית web
5. תן שם לאפליקציה (למשל: "מחשבון מניות")
6. העתק את פרטי הקונפיגורציה

## שלב 5: עדכון הקוד

1. צור קובץ `.env.local` בתיקיית הפרויקט
2. הוסף את הפרטים הבאים:

```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

3. החלף את הפרטים עם הפרטים האמיתיים שקיבלת מ-Firebase

## שלב 6: הפעלת האפליקציה

1. הפעל את השרת: `npm run dev`
2. פתח את האתר ב: `http://localhost:5173`
3. לחץ על "התחבר עם Google"
4. אשר את הכניסה עם חשבון Google שלך

## שלב 7: App Check (מומלץ)

1. עבור ל-Firebase Console → App Check
2. בחר ביישום ה-Web שלך והפעל ReCaptcha v3 (חינמי)
3. העתק את ה-Site Key
4. הוסף ל-`.env.local` שורה:

```
VITE_APPCHECK_SITE_KEY=your_recaptcha_v3_site_key
```

5. רענן `npm run dev`

## הערות חשובות

- וודא שהדומיין `localhost:5173` מופיע ברשימת הדומיינים המורשים ב-Firebase Authentication
- לפיתוח, Firestore Database צריך להיות במצב "test mode"
- לפריסה, תצטרך להגדיר כללי אבטחה מתאימים ב-Firestore
  - ניתן להדביק את הכללים מקובץ `firestore.rules` תחת Firestore → Rules בקונסול, ולאחר מכן Publish

## פתרון בעיות

אם אתה נתקל בבעיות:
1. בדוק שהפרטים ב-`.env.local` נכונים
2. וודא ש-Google Authentication מופעל ב-Firebase
3. בדוק שהדומיין מופיע ברשימת הדומיינים המורשים
4. פתח את Developer Tools בדפדפן ובדוק אם יש שגיאות בקונסול
