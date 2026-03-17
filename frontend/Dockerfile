FROM nginx:alpine
COPY app/static /usr/share/nginx/html
# Create a template and substitute the port at container startup to support Cloud Run's dynamic $PORT
CMD ["/bin/sh", "-c", "printf 'server { listen %s; location / { root /usr/share/nginx/html; index index.html index.htm; try_files $uri $uri/ /index.html; } }' \"${PORT:-8080}\" > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
