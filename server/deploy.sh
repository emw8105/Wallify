#!/bin/bash

# build the docker image locally
echo "Building the Docker image locally..."
docker build --no-cache -t wallify-server .

# save the docker image to a tar file
echo "Saving the Docker image..."
docker save -o wallify-server.tar wallify-server

# copy the image to ec2
echo "Copying the Docker image to EC2..."
scp -i "./wallify-dev.pem" wallify-server.tar ec2-user@ec2-18-215-27-1.compute-1.amazonaws.com:/home/ec2-user/

# ssh into ec2 and load the docker image
echo "Connecting to EC2 for deployment..."
ssh -vvv -i "./wallify-dev.pem" ec2-user@ec2-18-215-27-1.compute-1.amazonaws.com << 'ENDSSH'
  # navigate to the working directory
  cd /home/ec2-user/

  # clean up unused docker images to free up space, this ec2 has like no space
  echo "Pruning old Docker images..."
  docker image prune -a -f

  # check disk space before loading the new image
  DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
  THRESHOLD=85
  if [ "$DISK_USAGE" -gt "$THRESHOLD" ]; then
    echo "Disk usage is over $THRESHOLD%, freeing up additional space..."
    docker container prune -f
    docker volume prune -f
  fi

  # load new docker image
  echo "Loading the new Docker image..."
  docker load -i wallify-server.tar

  # stop and remove any existing docker containers
  echo "Stopping and removing existing containers..."
  docker stop $(docker ps -q) && docker rm $(docker ps -aq)

  # run the new container, has auto restart enabled so functionality is not interrupted
  echo "Running the new Docker container..."
  docker run -d --restart=always -p 8888:8888 wallify-server

  # clean up the .tar file to free up space
  echo "Removing the Docker image tar file..."
  rm wallify-server.tar

  echo "Deployment complete on EC2!"
ENDSSH

# clean up local tar file
echo "Cleaning up local tar file..."
rm wallify-server.tar

echo "Local deployment steps complete!"

# run using ./deploy.sh