FROM alpine:latest
RUN apk update
RUN apk add openjdk8-jre
RUN apk add curl
COPY target/emby-library-update-connector.jar /tmp
WORKDIR /tmp
EXPOSE 8080
ENTRYPOINT ["java","-jar", "emby-library-update-connector.jar"]
