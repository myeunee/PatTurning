/**
 *
 *  price-info 경로 api 요청의 반환 값인 가격 정보를 담은 domain
 *
 */

package com.swdc.server.domain.mongoDB;

import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 *
 *  최근 며칠 내의 가격과 평균, 최저, 최고가 가격 정보를 담은 객체
 *
 *  최근 가격 정보 list인 prices만으로 avg, min, max를 계산하여 초기화
 *
 */
@NoArgsConstructor
@Getter
@Setter
@Builder
public class Price {
    private List<Map<String, Integer>> prices;
    private Integer avg;
    private Integer min;
    private Integer max;

    public static class PriceBuilder {
        public Price build() {
            Price price = new Price();
            price.prices = this.prices;

            // Flatten the list of maps and get the values
            List<Integer> allPrices = price.prices.stream()
                    .flatMap(map -> map.values().stream())
                    .collect(Collectors.toList());

            // Calculate min, max, avg
            price.min = allPrices.stream().min(Integer::compareTo).orElse(null);
            price.max = allPrices.stream().max(Integer::compareTo).orElse(null);
            price.avg = Optional.ofNullable(allPrices.isEmpty() ? null : allPrices.stream()
                            .collect(Collectors.averagingInt(Integer::intValue)))
                    .map(Double::intValue)
                    .orElse(null);

            return price;
        }
    }

}
