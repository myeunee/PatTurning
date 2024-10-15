/**
 *
 *  Filestore에 mount된 filesystem과 상호작용하는 service
 *
 */

package com.swdc.server.service;

import com.swdc.server.domain.storage.Price;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    /**
     *
     *  file system에서 "{fileSystemPath}/platform/category_name/product_id.txt"에 해당하는 product의 가격 정보를 반환
     *
     *  가격이 변경되는 시점 & 하루가 바뀌는 시점의 가격 정보만 가져옴
     *
     */
    public Price getProductDetails(String platform, String category_name, String product_id) {
        Path fileSystemPath = Paths.get(BASE_PATH);
        Path productPath = fileSystemPath.resolve(platform).resolve(category_name).resolve(product_id + ".txt");

        List<Map<String, Integer>> prices = new ArrayList<>();

        try (BufferedReader bufferedReader = Files.newBufferedReader(productPath)) {
            String previousLine = null;
            String currentLine;
            String previousDate = null;

            while ((currentLine = bufferedReader.readLine()) != null) {
                String[] parts = currentLine.split(",");
                String dateTime = parts[0] + "," + parts[1];
                int currentPrice = Integer.parseInt(parts[2]);
                String currentDate = parts[0];

                if (previousLine == null || !previousLine.split(",")[2].equals(parts[2])) {
                    prices.add(Map.of(dateTime, currentPrice));
                }

                if (previousDate != null && !currentDate.equals(previousDate) && parts[1].equals("00:00")) {
                    prices.add(Map.of(dateTime, currentPrice));
                }

                previousLine = currentLine;
                previousDate = currentDate;
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
     *  가격이 변경되는 시점 & 하루가 바뀌는 시점의 가격 정보만 가져옴
     *
     */
    public Price getProductDetailsWithoutCategory(String platform, String product_id) {
        Path basePath = Paths.get(BASE_PATH).resolve(platform);

        List<Map<String, Integer>> allPrices = new ArrayList<>();


        try {
            Files.walk(basePath)
                    .filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().equals(product_id + ".txt"))
                    .forEach(filePath -> {
                        String previousLine = null;
                        String previousDate = null;

                        try (BufferedReader bufferedReader = Files.newBufferedReader(filePath)) {
                            String currentLine;

                            while ((currentLine = bufferedReader.readLine()) != null) {
                                String[] parts = currentLine.split(",");
                                String dateTime = parts[0] + "," + parts[1];
                                int currentPrice = Integer.parseInt(parts[2]);
                                String currentDate = parts[0];

                                // 가격이 변경된 경우 추가
                                if (previousLine == null || !previousLine.split(",")[2].equals(parts[2])) {
                                    allPrices.add(Map.of(dateTime, currentPrice));
                                }

                                // 날짜가 바뀌는 시점 (00:00)에 추가
                                if (previousDate != null && !currentDate.equals(previousDate) && parts[1].equals("00:00")) {
                                    allPrices.add(Map.of(dateTime, currentPrice));
                                }

                                previousLine = currentLine;
                                previousDate = currentDate;
                            }
                        } catch (IOException e) {
                            System.err.println("Error reading file: " + filePath + ". Error: " + e.getMessage());
                        }
                    });
        } catch (IOException e) {
            System.err.println("Error traversing directories: " + basePath + ". Error: " + e.getMessage());
        }

        Price priceInfo = Price.builder()
                .prices(allPrices)
                .build();

        return priceInfo;
    }
}
