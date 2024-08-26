#!/bin/bash

for n in {7..50}
do
   scrapy crawl gmarket -a n=$n &
done

wait
