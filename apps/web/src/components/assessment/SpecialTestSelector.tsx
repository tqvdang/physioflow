"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useSpecialTests,
  useSearchTests,
  type SpecialTest,
  type TestCategory,
} from "@/hooks/use-special-tests";

const CATEGORIES: { value: TestCategory; labelKey: string }[] = [
  { value: "shoulder", labelKey: "shoulder" },
  { value: "knee", labelKey: "knee" },
  { value: "spine", labelKey: "spine" },
  { value: "hip", labelKey: "hip" },
  { value: "ankle", labelKey: "ankle" },
  { value: "elbow", labelKey: "elbow" },
];

interface SpecialTestSelectorProps {
  onSelectTest: (test: SpecialTest) => void;
  selectedTestIds?: string[];
}

export function SpecialTestSelector({
  onSelectTest,
  selectedTestIds = [],
}: SpecialTestSelectorProps) {
  const t = useTranslations("specialTests");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<TestCategory>("shoulder");

  const { data: categoryTests, isLoading: categoryLoading } = useSpecialTests(activeCategory);
  const { data: searchResults, isLoading: searchLoading } = useSearchTests(searchQuery);

  const isSearching = searchQuery.length >= 2;
  const displayTests = isSearching ? searchResults : categoryTests;
  const isLoading = isSearching ? searchLoading : categoryLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <Input
          placeholder={t("searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* Category Tabs */}
        {!isSearching && (
          <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as TestCategory)}>
            <TabsList className="grid w-full grid-cols-6">
              {CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.value} value={cat.value} className="text-xs">
                  {t(`categories.${cat.labelKey}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Test List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {isLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("loading")}
            </p>
          )}

          {!isLoading && (!displayTests || displayTests.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {isSearching ? t("noSearchResults") : t("noTests")}
            </p>
          )}

          {displayTests?.map((test) => (
            <SpecialTestCard
              key={test.id}
              test={test}
              isSelected={selectedTestIds.includes(test.id)}
              onSelect={() => onSelectTest(test)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface SpecialTestCardProps {
  test: SpecialTest;
  isSelected: boolean;
  onSelect: () => void;
}

function SpecialTestCard({ test, isSelected, onSelect }: SpecialTestCardProps) {
  const t = useTranslations("specialTests");

  return (
    <div
      className={`border rounded-lg p-3 transition-colors ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">{test.name}</h4>
            <Badge variant="outline" className="text-xs shrink-0">
              {t(`categories.${test.category}`)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-1">{test.nameVi}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{test.description}</p>

          {/* Sensitivity / Specificity */}
          {(test.sensitivity !== undefined || test.specificity !== undefined) && (
            <div className="flex gap-3 mt-2">
              {test.sensitivity !== undefined && (
                <span className="text-xs">
                  <span className="text-muted-foreground">{t("sensitivity")}:</span>{" "}
                  <span className="font-medium">{test.sensitivity}%</span>
                </span>
              )}
              {test.specificity !== undefined && (
                <span className="text-xs">
                  <span className="text-muted-foreground">{t("specificity")}:</span>{" "}
                  <span className="font-medium">{test.specificity}%</span>
                </span>
              )}
            </div>
          )}
        </div>

        <Button
          size="sm"
          variant={isSelected ? "secondary" : "default"}
          onClick={onSelect}
          disabled={isSelected}
          className="shrink-0"
        >
          {isSelected ? t("added") : t("addToAssessment")}
        </Button>
      </div>
    </div>
  );
}

export default SpecialTestSelector;
