from airflow import DAG
from airflow.providers.cncf.kubernetes.operators.kubernetes_pod import (
    KubernetesPodOperator,
)
from airflow.utils.dates import days_ago
from airflow.kubernetes.secret import Secret
from airflow.utils.task_group import TaskGroup
from datetime import timedelta
from kubernetes.client import V1ResourceRequirements

# Kubernetes Secret 설정
secret_db_username = Secret("env", "MONGO_USERNAME", "mongodb-secret", "mongo-username")
secret_db_password = Secret("env", "MONGO_PASSWORD", "mongodb-secret", "mongo-password")
secret_db_host = Secret("env", "MONGO_URL", "mongodb-secret", "mongo-url")

# 분산 수행할 pods 개수
n_pods = 5

default_args = {
    "owner": "airflow",
    "start_date": days_ago(1),
    "execution_timeout": timedelta(hours=12),
}


# 공통 크롤링 Pod 템플릿
def create_pod_task(i):
    return KubernetesPodOperator(
        task_id=f"gmarket_crawler_{i+1}",
        namespace="airflow",
        image="gudev/gmarket-crawl:1.0.7",
        name=f"gmarket-crawler-{i+1}",
        in_cluster=True,
        get_logs=True,
        container_resources=V1ResourceRequirements(
            requests={"memory": "1Gi", "cpu": "500m"},
            limits={"memory": "2Gi", "cpu": "1"},
        ),
        cmds=[
            "scrapy",
            "crawl",
            "gmarket",
            "-a",
            f"n={i+1}",  # 여기에서 n 값을 넘겨줌
        ],
        startup_timeout_seconds=1800,
        image_pull_policy="Always",
        secrets=[
            secret_db_username,
            secret_db_password,
            secret_db_host,
        ],
    )


with DAG(
    dag_id="gmarket_scraper",
    default_args=default_args,
    schedule_interval=None,
) as dag:

    # mongodb와 상호작용하며 base_url 얻기. n_pods 개의 document로 나누어 저장.
    run_scraper = KubernetesPodOperator(
        task_id="gmarket-get_base_urls",
        namespace="airflow",
        image="gudev/gmarket-get_base_urls:latest",
        name="gmarket-get_base_urls",
        in_cluster=True,
        get_logs=True,
        startup_timeout_seconds=600,
        cmds=[
            "python3",
            "/app/gmarket/main.py",
            str(n_pods),
        ],  # n_pods 값을 인자로 전달
        secrets=[
            secret_db_username,
            secret_db_password,
            secret_db_host,
        ],
    )

    # TaskGroup을 사용하여 n_pods 개의 크롤러 태스크를 그룹화
    with TaskGroup("gmarket_crawlers") as gmarket_crawlers:
        for i in range(n_pods):
            pod_task = create_pod_task(i)
            run_scraper >> pod_task

    run_scraper >> gmarket_crawlers
