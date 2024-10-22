#!/bin/bash

# Step 1: Build the Docker image locally
echo "Building the Docker image locally..."
docker build --no-cache -t wallify-server .

# Step 2: Save the Docker image to a .tar file
echo "Saving the Docker image..."
docker save -o wallify-server.tar wallify-server

# Step 3: Copy the Docker image to EC2
echo "Copying the Docker image to EC2..."
scp -i "./wallify-dev.pem" wallify-server.tar ec2-user@ec2-18-215-27-1.compute-1.amazonaws.com:/home/ec2-user/

# Step 4: SSH into EC2 and perform the deployment
echo "Connecting to EC2 for deployment..."
ssh -vvv -i "./wallify-dev.pem" ec2-user@ec2-18-215-27-1.compute-1.amazonaws.com << 'ENDSSH'
  # Step 4.1: Navigate to the working directory
  cd /home/ec2-user/

  # Step 4.2: Clean up unused Docker images to free up space
  echo "Pruning old Docker images..."
  docker image prune -a -f

  # Step 4.3: Check disk space before loading the new image
  DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
  THRESHOLD=85
  if [ "$DISK_USAGE" -gt "$THRESHOLD" ]; then
    echo "Disk usage is over $THRESHOLD%, freeing up additional space..."
    docker container prune -f
    docker volume prune -f
  fi

  # Step 4.4: Load the new Docker image
  echo "Loading the new Docker image..."
  docker load -i wallify-server.tar

  # Step 4.5: Stop and remove any existing Docker containers
  echo "Stopping and removing existing containers..."
  docker stop $(docker ps -q) && docker rm $(docker ps -aq)

  # Step 4.6: Run the new container with restart policy
  echo "Running the new Docker container..."
  docker run -d --restart=always -p 8888:8888 wallify-server

  # Step 4.7: Clean up the .tar file to free up space
  echo "Removing the Docker image tar file..."
  rm wallify-server.tar

  echo "Deployment complete on EC2!"
ENDSSH

# Step 5: Clean up local tar file
echo "Cleaning up local tar file..."
rm wallify-server.tar

echo "Local deployment steps complete!"

# run using ./deploy.sh