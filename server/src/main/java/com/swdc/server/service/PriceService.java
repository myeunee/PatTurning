/**
 *
 *  Product_price_db와 상호작용하는 service
 *
 */

package com.swdc.server.service;

import com.swdc.server.domain.storage.Price;
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
    private static final String BASE_PATH = "/mnt/patturning";

    @Autowired
    private MongoTemplate mongoTemplate;

    /**
     *
     *  file system에서 "{fileSystemPath}/platform/category_name/product_id.txt"에 해당하는 product의 가격 정보를 반환
     *
     */
    public Price getProductDetails(String platform, String category_name, String product_id) {
        Path fileSystemPath = Paths.get(BASE_PATH);
        Path productPath = fileSystemPath.resolve(platform).resolve(category_name).resolve(product_id + ".txt");

        List<Map<String, Integer>> prices = new ArrayList<>();

        try (BufferedReader bufferedReader = Files.newBufferedReader(productPath)) {
            String previousLine = null;
            String currentLine;

            while ((currentLine = bufferedReader.readLine()) != null) {
                String[] parts = currentLine.split(",");
                String dateTime = parts[0] + "," + parts[1];
                int currentPrice = Integer.parseInt(parts[2]);

                // 이전 라인의 가격 정보와 비교
                if (previousLine != null) {
                    String[] prevParts = previousLine.split(",");
                    int previousPrice = Integer.parseInt(prevParts[2]);

                    // 가격이 달라졌을 때만 기록
                    if (previousPrice != currentPrice) {
                        prices.add(Map.of(dateTime, currentPrice));
                    }
                } else {
                    // 첫 번째 라인은 비교할 이전 가격이 없으므로 기록
                    prices.add(Map.of(dateTime, currentPrice));
                }

                // 현재 라인을 이전 라인으로 업데이트
                previousLine = currentLine;
            }
        } catch (FileNotFoundException e) {
            System.err.println("File not found: " + productPath + ". Error: " + e.getMessage());
        } catch (IOException e) {
            System.err.println("Error reading file: " + productPath + ". Error: " + e.getMessage());
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
                        String previousLine = null;

                        try (BufferedReader bufferedReader = Files.newBufferedReader(filePath)) {
                            String currentLine;

                            while ((currentLine = bufferedReader.readLine()) != null) {
                                String[] parts = currentLine.split(",");
                                String dateTime = parts[0] + "," + parts[1];
                                int currentPrice = Integer.parseInt(parts[2]);

                                // 이전 라인의 가격과 비교
                                if (previousLine != null) {
                                    String[] prevParts = previousLine.split(",");
                                    int previousPrice = Integer.parseInt(prevParts[2]);

                                    // 가격이 변동되었을 때만 기록
                                    if (previousPrice != currentPrice) {
                                        allPrices.add(Map.of(dateTime, currentPrice));
                                    }
                                } else {
                                    // 첫 번째 라인은 비교 대상이 없으므로 기록
                                    allPrices.add(Map.of(dateTime, currentPrice));
                                }

                                // 현재 라인을 이전 라인으로 설정
                                previousLine = currentLine;
                            }
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
