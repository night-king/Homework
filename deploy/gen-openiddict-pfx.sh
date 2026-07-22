#!/usr/bin/env bash
# 生成 OpenIddict 令牌签名/加密用的自签证书 openiddict.pfx。
# Host 在 Production 下用 AddProductionEncryptionAndSigningCertificate("openiddict.pfx", <口令>) 从
# 运行目录加载它；缺了这个文件 Host 启动即崩。自签即可——它只用于签/加密令牌，不需要 CA 背书。
#
# ⚠️ 口令必须与源码 HomeworkHttpApiHostModule.PreConfigureServices 里硬编码的一致。
#    （上线加固时应把口令挪到环境变量/配置，见 DEPLOY.md「密钥移出明文」。）
#
# 用法：  ./gen-openiddict-pfx.sh [输出路径]
#   默认输出到当前目录 openiddict.pfx；部署时放到 /var/www/homework/api/ 下。
set -euo pipefail

PASS="3b430890-bef8-40bc-8274-86f32686cd0f"
OUT="${1:-openiddict.pfx}"

if [ -f "$OUT" ]; then
  echo "已存在 $OUT，未覆盖。要重建请先删除它（注意：换证书会让已签发的令牌全部失效）。"
  exit 0
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

openssl req -x509 -newkey rsa:2048 -sha256 -days 3650 -nodes \
  -keyout "$tmp/key.pem" -out "$tmp/cert.pem" -subj "/CN=Homework OpenIddict"
openssl pkcs12 -export -out "$OUT" -inkey "$tmp/key.pem" -in "$tmp/cert.pem" -passout "pass:$PASS"

chmod 600 "$OUT"
echo "已生成 $OUT（10 年有效，口令与源码一致）。放到 Host 运行目录（supervisor directory=）即可。"
