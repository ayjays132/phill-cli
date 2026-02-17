FROM docker.io/library/node:20-slim

ARG SANDBOX_NAME="phill-cli-sandbox"
ARG CLI_VERSION_ARG
ENV SANDBOX="$SANDBOX_NAME"
ENV CLI_VERSION=$CLI_VERSION_ARG

# install minimal set of packages, then clean up
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  make \
  g++ \
  man-db \
  curl \
  dnsutils \
  less \
  jq \
  bc \
  gh \
  git \
  unzip \
  rsync \
  ripgrep \
  procps \
  psmisc \
  lsof \
  socat \
  ca-certificates \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# set up npm global package folder under /usr/local/share
# give it to non-root user node, already set up in base image
RUN mkdir -p /usr/local/share/npm-global \
  && chown -R node:node /usr/local/share/npm-global
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin

# switch to non-root user node
USER node

# install phill-cli and clean up
COPY packages/cli/dist/google-phill-cli-*.tgz /tmp/phill-cli.tgz
COPY packages/core/dist/google-phill-cli-core-*.tgz /tmp/phill-core.tgz
RUN npm install -g /tmp/phill-cli.tgz /tmp/phill-core.tgz \
  && npm cache clean --force \
  && rm -f /tmp/phill-{cli,core}.tgz

# default entrypoint when none specified
CMD ["phill"]
