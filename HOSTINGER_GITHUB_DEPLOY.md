# GitHub + Hostinger

Это приложение не является просто статическим HTML-сайтом.

Здесь есть:

- `Python` сервер
- `API` для шаблонов, пользователей и истории
- `SQLite`
- файловая история коллажей

Поэтому для нормальной работы нужен `Hostinger VPS`.

## Рекомендуемая схема

1. Храни исходники в GitHub
2. На Hostinger VPS клонируй репозиторий
3. Запускай приложение как Python-сервис
4. Данные храни отдельно от кода через `PERA_DATA_DIR`

## Что пойдёт в GitHub

В репозиторий лучше отправлять:

- `app.js`
- `index.html`
- `styles.css`
- `server.py`
- `serve.ps1`
- `Dockerfile`
- `.dockerignore`
- `README.md`

Не надо коммитить runtime-данные:

- `history/`
- `templates/`
- `pera.sqlite3`
- `data/`

Это уже добавлено в `.gitignore`.

## Что нужно создать на GitHub

Создай пустой репозиторий, например:

- `pera-collage-studio`

Потом в папке проекта выполни:

```powershell
git add .
git commit -m "Initial project setup"
git branch -M main
git remote add origin https://github.com/USERNAME/pera-collage-studio.git
git push -u origin main
```

Замени `USERNAME` на свой GitHub.

## Как выкатывать на Hostinger VPS

На сервере:

1. Установи Python 3
2. Установи git
3. Клонируй репозиторий
4. Создай папку данных, например:

```bash
mkdir -p /var/pera-collage-data
```

5. Запускай сервер с переменными:

```bash
export HOST=0.0.0.0
export PORT=8080
export PERA_DATA_DIR=/var/pera-collage-data
python server.py
```

## Как обновлять проект потом

Дальше поток работы будет такой:

1. Мы правим проект здесь
2. Ты пушишь изменения в GitHub
3. На VPS делаешь:

```bash
git pull
```

4. Перезапускаешь сервис

## Что лучше сделать дальше

После подключения GitHub я рекомендую следующим шагом:

1. сделать `systemd` сервис для автозапуска
2. поставить `Nginx` как reverse proxy
3. подключить домен и `SSL`

Тогда проект будет уже по-взрослому развёрнут.
