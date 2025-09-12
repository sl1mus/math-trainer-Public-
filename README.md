
# Math Trainer Upgrade v0.3

Обновление для тренажёра начальной школы: фикс прогресса по пользователям и новый тип задания «Последовательность по клику».

## Что нового
- Персонифицированное хранилище (`src/utils/storage.js`) с неймспейсом `prefix:userId:key`. Работает на `localStorage`/`sessionStorage` с фолбэком на IndexedDB.
- Компонент `SequenceOrderTask` (без drag&drop) — доступно с клавиатуры и на мобильных.
- Демо-страница `public/index.html`.
- Пример данных по программе Петерсон 4 класс `data/peterson-grade4.json`.

## Установка
Скопируйте папку `math-trainer-upgrade-v0.3` в корень репозитория и интегрируйте по инструкции ниже.

### Быстрый старт (демо)
Откройте `public/index.html` в браузере.

## Интеграция в проект
1. Подключите хранилище:
   ```html
   <script src="src/utils/storage.js"></script>
   ```
   ```js
   const store = createStorage({ userId: currentUserId || 'anon', driver: 'local' });
   await store.set('progress', {...});
   ```
2. Замените drag&drop на `SequenceOrderTask`:
   ```html
   <link rel="stylesheet" href="src/components/SequenceOrderTask.css">
   <script src="src/components/SequenceOrderTask.js"></script>
   <div id="seq"></div>
   <script>
     const task = new SequenceOrderTask({ container: document.getElementById('seq'), items: ['3+4','5+2'], correctOrder: [1,0] });
   </script>
   ```

## Лицензия
MIT
