**MongoDB database exports:**
diabetes_thesis/mongo_exports

**Notes**
- myapp.js : main code
- /models/user.js : mongo models
- /views : contains .ejs templates (html pages)
- /static : contains all static content such as css, js, icons, fonts etc

**Run app**
1. Install npm modules
2. $systemctl start mongod.service
2. Run make file using command : $ make
3. URL: localhost:3000/

**Run Docker**
- $sudo docker build . -t thesis/node-web-app
- $sudo docker-compose up

Stop docker-compose: $sudo docker-compose down

**When JSON export files are updated, It is important to delete the 'data' directory of the source directory before rebuilding docker**

**Clear unused docker image data**: $sudo docker system prune

**Sources**
<a href="https://github.com/HarshvardhanThosar/ChatBot-UI">Chatbot Base UI<a>


