# build the docker image
docker build --no-cache -t wallify-server .

# save the docker image
docker save -o wallify-server.tar wallify-server

# copy the image to EC2
scp -i "C:/Users/EMW81/Desktop/Code shit/SpotiWall/server/wallify-dev.pem" wallify-server.tar ec2-user@ec2-18-215-27-1.compute-1.amazonaws.com:/home/ec2-user/

# ssh into EC2 and deploy
ssh -vvv -i "C:/Users/EMW81/Desktop/Code shit/SpotiWall/server/wallify-dev.pem" ec2-user@ec2-18-215-27-1.compute-1.amazonaws.com << 'ENDSSH'
cd /home/ec2-user/
docker load -i wallify-server.tar
docker stop $(docker ps -q) && docker rm $(docker ps -aq)
docker run -d --restart=always -p 8888:8888 wallify-server
rm wallify-server.tar
ENDSSH

echo "Deployment complete"
