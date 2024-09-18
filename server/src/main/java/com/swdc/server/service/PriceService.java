/**
 *
 *  Product_price_db와 상호작용하는 service
 *
 */

package com.swdc.server.service;

import com.swdc.server.domain.mongoDB.Price;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 *
 *  주어진 parameter(platform, category_name, product_id)에 따라 적절한 탐색을 수행하는 service
 *  BASE_PATH는 mount된 file_system의 경로
 *
 */
@RequiredArgsConstructor
@Service
public class PriceService {

    private static final Logger logger = LoggerFactory.getLogger(PriceService.class);
    private static final String BASE_PATH = "/Users/sangyeong_park/CE/contest/file_system";

    @Autowired
    private MongoTemplate mongoTemplate;

    /**
     *
     *  file system에서 "fileSystemPath/platform/category_name/product_id.txt"에 해당하는 product의 가격 정보를 반환
     *
     */
    public Price getProductDetails(String platform, String category_name, String product_id) {
        Path fileSystemPath = Paths.get(BASE_PATH);
        Path productPath = fileSystemPath.resolve(platform).resolve(category_name).resolve(product_id + ".txt");

        List<Map<String, Integer>> prices = new ArrayList<>();

        try (BufferedReader bufferedReader = Files.newBufferedReader(productPath)) {
            prices = bufferedReader.lines()
                    .map(line -> line.split(",")) // 각 줄을 쉼표로 분리
                    .map(parts -> Map.of(parts[0], Integer.parseInt(parts[1]))) // 날짜와 가격을 Map으로 변환
                    .collect(Collectors.toList()); // 모든 맵을 리스트로 수집
        } catch (FileNotFoundException e) {
            System.err.println("File not found: " + productPath);
        } catch (IOException e) {
            System.err.println("Error reading file: " + productPath);
        }

        Price priceInfo = Price.builder()
                .prices(prices)
                .build();

        return priceInfo;
    }

    /**
     *
     *  file system에서 platform, product_id 정보만으로 존재하는
     *  platform의 product_id에 해당하는 item의 가격 정보 반환
     *  (존재하는 category_name 모두 전수탐색)
     *
     */
    public Price getProductDetailsWithoutCategory(String platform, String product_id) {
        Path basePath = Paths.get(BASE_PATH).resolve(platform);

        List<Map<String, Integer>> allPrices = new ArrayList<>();

        try {
            // Traverse all directories and files under the platform directory
            Files.walk(basePath)
                    .filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().equals(product_id + ".txt"))
                    .forEach(filePath -> {
                        try (BufferedReader bufferedReader = Files.newBufferedReader(filePath)) {
                            List<Map<String, Integer>> prices = bufferedReader.lines()
                                    .map(line -> line.split(","))
                                    .map(parts -> Map.of(parts[0], Integer.parseInt(parts[1])))
                                    .collect(Collectors.toList());
                            allPrices.addAll(prices);
                        } catch (IOException e) {
                            System.err.println("Error reading file: " + filePath);
                        }
                    });
        } catch (IOException e) {
            System.err.println("Error traversing directories: " + basePath);
        }

        Price priceInfo = Price.builder()
                .prices(allPrices)
                .build();

        return priceInfo;
    }
}