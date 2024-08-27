package com.swdc.server.domain.mongoDB;

import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

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
