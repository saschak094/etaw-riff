# etaw-riff

Google offers a 300$ free trial for Google Cloud which is good option to run a managed Kubernetes cluster.

## Prerequisites

- Create a google cloud account
- Install the [gcloud sdk](https://cloud.google.com/sdk/install)
- Install the [riff cli](https://github.com/projectriff/riff/releases)
- Configure gcloud

```bash
gcloud init
```

If you are already logged in to the google cloud via gcloud make sure gcloud points to the right project.

```bash
gcloud config set project PROJECT_ID
```

SET your PROJECT_ID into a environment variable

```bash
export GCP_PROJECT= ???
```

- Install the Kubernetes commandline client

```bash
gcloud components install kubectl
```

Configure the google zone of your choice. You can review them [here](https://cloud.google.com/compute/docs/regions-zones/)

```bash
gcloud config set compute/region europe-west3
gcloud config set compute/zone europe-west3-a
gcloud config list compute/
```

- Enable the relevant gcloud APIs

```
gcloud services enable \
  cloudapis.googleapis.com \
  container.googleapis.com \
  containerregistry.googleapis.com
```

## Create a Kubernetes Cluster

- Configure your project and cluster name. The name should consist of lower case letters

```bash
export CLUSTER_NAME=???
```

- Create the Kubernetes cluster

```bash
gcloud container clusters create $CLUSTER_NAME \
  --cluster-version=latest \
  --machine-type=n1-standard-2 \
  --enable-autoscaling --min-nodes=1 --max-nodes=3 \
  --enable-autorepair \
  --scopes=service-control,service-management,compute-rw,storage-ro,cloud-platform,logging-write,monitoring-write,pubsub,datastore \
  --num-nodes=3
```

Once the cluster is created check if Kubernetes client `kubectl` points to the right cluster. The output should consist of your google cloud project name, region + zone and cluster name

```bash
kubectl config current-context
```

Grant yourself cluster-admin permissions

```bash
kubectl create clusterrolebinding cluster-admin-binding \
--clusterrole=cluster-admin \
--user=$(gcloud config get-value core/account)
```

## Create and initalize Google Container Registry

Create a service account

```bash
gcloud iam service-accounts create publisher
```

Bind the service account to the `storage.admin` role

```bash
gcloud projects add-iam-policy-binding $GCP_PROJECT \
    --member serviceAccount:publisher@$GCP_PROJECT.iam.gserviceaccount.com \
    --role roles/storage.admin
```

Create an authentication key using the publisher account. We will need them later to initialize riff.

```bash
gcloud iam service-accounts keys create \
  --iam-account "publisher@$GCP_PROJECT.iam.gserviceaccount.com" \
  gcr-storage-admin.json
```

## Install riff

Run the following command to install the riff platform.
The installation will create pods and deployments in the `istio-system, knative-build, knative-eventing, knative-serving` namespaces.

```bash
riff system install
```

Initialize the riff namespace. For demo purposes we are using the default namespace, but you are free to use whatever namespace you want.

```bash
riff namespace init default --gcr gcr-storage-admin.json
```

## Create function

Build and deploy the already prepared function

```bash
riff function create node session-randomizer --git-repo https://github.com/saschak094/riff-sessions.git --artifact sessions.js --image=gcr.io/$GCP_PROJECT/session-randomizer --wait --verbose
```

Once build and deployment are done you should be able to invoke the function over http using the riff cli

```bash
riff service invoke session-randomizer --text -- -w '\n' -d monday
```