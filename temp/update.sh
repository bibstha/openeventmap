echo "*************************************************************************"
echo "*************************************************************************"
/home/bibek/bin/osmosis --replicate-apidb user=myosmuser database=myosmdb validateSchemaVersion=no --write-replication workingDirectory=replicate
a=`grep 'sequenceNumber' replicate/state.txt | awk -F"=" {'print $2'}`
a=$(printf %09d $a)
filename=replicate/${a:0:3}/${a:3:3}/${a:6:3}.osc.gz
echo $filename
rm expire.list
osm2pgsql -U myosmuser -s -d mymapnikdb --append $filename -e15 -o expire.list
cat expire.list | /usr/local/bin/render_expired --min-zoom=10 --touch-from=10
