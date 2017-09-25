FROM mhart/alpine-node:8
MAINTAINER DecentM <decentm@decentm.com>

RUN mkdir /nodeblock
RUN mkdir /nodeblock/build
COPY ./build/* /nodeblock/build/
COPY ./package.json /nodeblock/package.json
COPY ./entrypoint.sh /nodeblock/entrypoint.sh
RUN chmod 555 /nodeblock/entrypoint.sh

EXPOSE 53

CMD ["ash", "/nodeblock/entrypoint.sh"]
