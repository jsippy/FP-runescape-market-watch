FROM node:alpine AS build
WORKDIR /app
COPY . .
RUN npm i && npm run build

FROM nginx:alpine
WORKDIR /app
COPY --from=build /app/build /usr/share/nginx/html
COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf
CMD ["nginx", "-g", "daemon off;"]
EXPOSE 80
