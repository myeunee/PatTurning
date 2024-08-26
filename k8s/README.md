# Airflow on k8s 환경 구축

## namespace 생성

```sh
kubectl create namespace airflow
```

## 데이터베이스 정보 추가

```sh
kubectl create secret generic mongodb-secret \
  --from-literal=mongo-username={username} \
  --from-literal=mongo-password={password} \
  --from-literal=mongo-url={url} -n airflow
```

## DAG 관리를 위한 github repository

```sh
kubectl create secret generic git-credentials-secret \
  --from-literal=GIT_USERNAME={username} \
  --from-literal=GIT_TOKEN={token} \
  -n airflow
```

## 실행

```sh
 helm install airflow bitnami/airflow -n airflow -f values.yaml
```
