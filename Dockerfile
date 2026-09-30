FROM alpine/git:v2.54.0

RUN apk add --no-cache \
    bash \
    ca-certificates

ENV HOME=/tmp

WORKDIR /workspace

USER 1028:100

CMD ["bash", "-lc", "trap : TERM INT; sleep infinity & wait"]