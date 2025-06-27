@echo off
echo Démarrage des services Docker...
docker-compose up -d postgres redis
echo Services démarrés !
pause
