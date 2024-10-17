# build the docker image
docker build -t wallify-server .

# save the docker image
docker save -o wallify-server.tar wallify-server

# copy the image to EC2
scp -i "C:/Users/EMW81/Desktop/Code shit/SpotiWall/server/wallify-dev.pem" wallify-server.tar ec2-user@ec2-18-207-162-47.compute-1.amazonaws.com:/home/ec2-user/

# ssh into EC2 and deploy
ssh -i "C:/Users/EMW81/Desktop/Code shit/SpotiWall/server/wallify-dev.pem" ec2-user@ec2-18-207-162-47.compute-1.amazonaws.com << 'ENDSSH'
docker load -i wallify-server.tar
docker ps -q | xargs -r docker stop
docker ps -aq | xargs -r docker rm
docker run -d -p 8888:8888 wallify-server
ENDSSH

echo "Deployment complete"

# run in bash terminal using ./deploy.sh