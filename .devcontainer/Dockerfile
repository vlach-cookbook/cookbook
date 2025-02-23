FROM mcr.microsoft.com/devcontainers/javascript-node:22

ENV PNPM_HOME=/home/node/.local/share/pnpm
ENV FLYCTL_INSTALL="/home/node/.fly"
ENV PATH=/home/node/depot_tools:${PNPM_HOME}:${FLYCTL_INSTALL}/bin:${PATH}

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends bash-completion postgresql-client-15

RUN su node -c "npm remove -g pnpm" && su node -c "npm install -g corepack" && corepack enable

RUN su node -c "pnpm install -g playwright && playwright install-deps"

RUN su node -c "git clone --filter=blob:none https://chromium.googlesource.com/chromium/tools/depot_tools.git /home/node/depot_tools && git rebase-update --help>/dev/null"

RUN su node -c "curl -fsSL https://fly.io/install.sh | sh"

COPY --chmod=755 <<EOF /usr/local/bin/git-s
#!/bin/sh
git map-branches -v
git status
EOF
