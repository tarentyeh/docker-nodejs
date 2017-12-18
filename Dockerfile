FROM node:latest
# Add package description of this app
ADD package.json package.json
# Install npm packages defined in package.json
RUN npm install
# Add main entry script
ADD helloworld.js helloworld.js
ADD index.js index.js
ADD poloniex.js poloniex.js
ADD helper.js helper.js
ADD debug.js debug.js
# Container's port
EXPOSE 8088

CMD [ "node" ]
