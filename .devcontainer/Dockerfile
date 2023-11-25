FROM mcr.microsoft.com/devcontainers/typescript-node:0-18

ENV PNPM_HOME=/home/node/.local/share/pnpm
ENV FLYCTL_INSTALL="/home/node/.fly"
ENV PATH=/home/node/depot_tools:${PNPM_HOME}:${FLYCTL_INSTALL}/bin:${PATH}

RUN corepack enable && corepack prepare pnpm@latest --activate

RUN su node -c "pnpm install -g prisma playwright && playwright install-deps"

RUN su node -c "git clone --filter=blob:none https://chromium.googlesource.com/chromium/tools/depot_tools.git /home/node/depot_tools && git rebase-update --help>/dev/null"

RUN su node -c "curl -fsSL https://fly.io/install.sh | sh"

COPY --chmod=755 <<EOF /usr/local/bin/git-s
#!/bin/sh
git map-branches -v
git status
EOF

# [Optional] Uncomment this section to install additional OS packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here>

# [Optional] Uncomment if you want to install an additional version of node using nvm
# ARG EXTRA_NODE_VERSION=10
# RUN su node -c "source /usr/local/share/nvm/nvm.sh && nvm install ${EXTRA_NODE_VERSION}"

# [Optional] Uncomment if you want to install more global node modules
# RUN su node -c "npm install -g <your-package-list-here>"
