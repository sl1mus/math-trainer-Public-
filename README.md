# Математический тренажёр • 4 класс (v0.1)

Тренажёр для повторения тем 1–3 классов и изучения тем 4 класса. Основа — программа **Петерсон**. Русский интерфейс. Развёртывание на **GitHub Pages**.

## Возможности
- Поурочные блоки (темы) + упражнения.
- Типы заданий: выбор ответа, ввод ответа, упорядочивание шагов (drag&drop).
- Прогрессивные подсказки (каждая подсказка снижает балл за задание).
- Статистика: баллы за блок, процент, время, локальное хранилище (localStorage).
- Дизайн в пастельных фиолетовых тонах.

## Стек
- **HTML + CSS + Vanilla JS** (без сборщиков и серверной части). Работает офлайн после загрузки.
- Хостинг: **GitHub Pages** (статические файлы).

## Установка и запуск
```bash
git clone https://github.com/<your-username>/math-trainer.git
cd math-trainer
python3 -m http.server 8000
```


---

## Публикация на GitHub Pages (пошагово)

### Вариант A (рекомендуется): Project Pages из ветки `main` (корень)
1. **Создайте репозиторий** на GitHub, публичный: `math-trainer`.
2. **Загрузите файлы** в корень (`index.html`, `styles.css`, `app.js`, `data/`, `.nojekyll`).  
3. В браузере откройте: **Repository → Settings → Pages**.  
   - **Build and deployment → Source:** *Deploy from a branch*  
   - **Branch:** `main` и **/ (root)**, нажмите **Save**.
4. Дождитесь билда. Сайт будет доступен по адресу:  
   `https://<ваш-логин>.github.io/math-trainer/`
5. Проверка: откройте страницу, убедитесь что темы подгружаются из `data/lessons.json` (нет ошибок в консоли).

> Файл **.nojekyll** уже добавлен, чтобы отключить обработку Jekyll и избежать скрытых файловых конфликтов.

### Вариант B: User/Org Pages (одно на аккаунт)
1. Создайте репозиторий **`<ваш-логин>.github.io`**.
2. Положите файлы тренажёра в корень и запушьте (см. команды ниже).
3. URL будет: `https://<ваш-логин>.github.io/` (без суффикса `/math-trainer/`).

### Вариант C: GitHub Actions (автодеплой при каждом `push`)
1. Файл workflow уже добавлен: `.github/workflows/deploy.yml`.
2. В репозитории откройте **Settings → Pages** и выберите **Source: GitHub Actions**.
3. При `git push` workflow соберёт и задеплоит сайт автоматически.  
   Статус смотрите во вкладке **Actions**.

### Вариант D: Папка `docs/` вместо корня
1. Переместите файлы сайта в папку `docs/`.
2. **Settings → Pages → Source: Deploy from a branch**; **Branch:** `main` и **/docs**.
3. Ссылка останется: `https://<ваш-логин>.github.io/math-trainer/`.

### Кастомный домен (опционально)
1. В **Settings → Pages** добавьте ваш домен (например, `math.example.com`).
2. Создайте у регистратора DNS-запись **CNAME** на `<ваш-логин>.github.io`.
3. В корне репозитория создайте файл **CNAME** c содержимым:
   ```
   math.example.com
   ```
4. Включите **Enforce HTTPS** после выдачи сертификата.

### Обновление сайта
Каждый раз после изменений:
```bash
git add .
git commit -m "chore: контент/правки"
git push
```
- Для варианта A/D (ветка): деплой стартует автоматически через GitHub Pages.
- Для варианта C (Actions): деплой выполняется workflow.

### Частые ошибки
- **404 / пустая страница** — проверьте: Settings → Pages (источник/ветка/путь).  
- **assets не грузятся** — используйте **относительные пути** (`styles.css`, `data/lessons.json`).  
- **кэш браузера** — обновите с очисткой (Ctrl/Cmd+Shift+R).  
- **Permissions** в Actions — должны включать `pages: write` и `id-token: write` (см. `deploy.yml`).

### Ссылки
- GitHub Pages Docs: https://docs.github.com/en/pages
- Actions: Deploy to Pages: https://docs.github.com/en/actions/deployment/deploying-to-github-pages
- Custom domain: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site
