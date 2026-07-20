#!/usr/bin/env bash
# ローカルPCで実行するAWS側の事前準備（EC2にはSSHしません）
# 実行前提: aws configure 済み、対象アカウント/リージョンが正しいこと

set -euo pipefail

INSTANCE_ID="i-09c623d3cadd54e29"
SG_ID="sg-02d71fa01077095ad"
REGION="ap-northeast-1"

echo "== 対象確認 =="
aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --region "$REGION" \
  --query 'Reservations[0].Instances[0].{Id:InstanceId,State:State.Name,PublicIp:PublicIpAddress,PublicDns:PublicDnsName}' \
  --output table

read -p "上記インスタンスに対して 80/443 番ポートを開放します。よろしいですか？ [y/N] " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "中止しました"
  exit 1
fi

echo "== 80番ポートを開放 =="
aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp --port 80 --cidr 0.0.0.0/0 \
  --region "$REGION" 2>&1 | grep -v "InvalidPermission.Duplicate" || true

echo "== 443番ポートを開放 =="
aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp --port 443 --cidr 0.0.0.0/0 \
  --region "$REGION" 2>&1 | grep -v "InvalidPermission.Duplicate" || true

echo "== 現在のインバウンドルール =="
aws ec2 describe-security-groups --group-ids "$SG_ID" --region "$REGION" \
  --query 'SecurityGroups[0].IpPermissions[].{Port:FromPort,Cidr:IpRanges[0].CidrIp}' \
  --output table

cat <<'NOTE'

--------------------------------------------------------------------
参考: このインスタンスにはElastic IPが割り当てられていません。
現在の公開アドレス (57.183.16.181 / ec2-57-183-16-181...) は、
インスタンスを停止・起動すると変わる可能性があります。

固定したい場合は下記コマンドで Elastic IP を割り当てられますが、
その場合ホスト名も新しいIPに合わせて変わる点にご注意ください
（EIP割り当て後、setup.sh / certbot.sh 内の HOSTNAME 変数と
 nginx server_name の更新が必要になります）。

  aws ec2 allocate-address --domain vpc --region ap-northeast-1
  aws ec2 associate-address --instance-id i-09c623d3cadd54e29 \
    --allocation-id <上のコマンドで得たAllocationId> --region ap-northeast-1
--------------------------------------------------------------------
NOTE
