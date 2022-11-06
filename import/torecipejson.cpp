#include "cb_database.h"

#include "time.h"
#include "unicode/unistr.h"
#include "json/json.h"
#include <fmt/core.h>
#include <memory>
#include <random>
#include <ranges>
#include <regex>

using Json::Value;

static const char hexDigits[] = "0123456789ABCDEF";

void maybe_set(Value &val, const char *key, const CB_String &s) {
  if (s.size() == 0)
    return;
  val[key] = s.str();
}
void maybe_append(Value &val, const CB_String &s) {
  if (s.size() == 0)
    return;
  val.append(s.str());
}

std::string lowerCase(const std::string &source) {
  icu::UnicodeString lower = icu::UnicodeString::fromUTF8(source);
  lower.toLower();
  std::string result;
  lower.toUTF8String(result);
  return result;
}

std::string titleCase(const std::string &source) {
  icu::UnicodeString title = icu::UnicodeString::fromUTF8(source);
  title.toTitle(nullptr);
  std::string result;
  title.toUTF8String(result);
  return result;
}

std::string urlFromTitle(const std::string &title) {
  static const std::regex nonAlnum("[^a-z0-9]+");
  std::string lowerTitle = lowerCase(title);
  return std::regex_replace(lowerTitle, nonAlnum, "-");
}

std::string escapeKey(const std::string &unescaped) {
  std::string result;
  for (unsigned char c : unescaped) {
    switch (c) {
    default:
      result += c;
      break;
    // These are the characters disallowed from Firebase keys.
    case '.':
    case '#':
    case '$':
    case '/':
    case '[':
    case ']':
    case '%': // And the escape character.
      result += '%';
      result += hexDigits[c / 16];
      result += hexDigits[c % 16];
      break;
    }
  }
  return result;
}

int main(int argc, char **argv) {
  if (argc < 2) {
    std::cout << "Pass the name of the recipe database to this program, "
                 "usually 'Recipe.cbd'.\n";
    exit(0);
  }
  const Value emptyObject(Json::objectValue);
  const Value emptyArray(Json::arrayValue);

  auto book = std::make_unique<CB_Book>();
  book->Read(argv[1]);

  Value root(Json::arrayValue);

  for (const CB_RecipeMap_t &recipes = book->Get_sortedByName();
       const auto &[_, recipe] :
#if 0
       std::views::take(recipes, 10)
#else
       recipes
#endif
  ) {
    Value &recipeJson = root.append(emptyObject);

    recipeJson["name"] = recipe->Get_name().str();

    maybe_set(recipeJson, "recipeYield", recipe->Get_serves());
    int year, month, day;

    if (3 ==
        sscanf(recipe->Get_date().c_str(), "%d-%d-%d", &month, &day, &year)) {
      recipeJson["dateCreated"] =
          fmt::format("{:04}-{:02}-{:02}", year, month, day);
    }

    Value categories(Json::arrayValue);
    maybe_append(categories, recipe->Get_cat1());
    maybe_append(categories, recipe->Get_cat2());
    maybe_append(categories, recipe->Get_cat3());
    maybe_append(categories, recipe->Get_cat4());
    recipeJson["recipeCategory"] = std::move(categories);

    const std::vector<CB_Ingredient *> &ingredients = recipe->Get_ingredients();
    Value &json_ingredients = recipeJson["recipeIngredient"] = emptyArray;
    for (CB_Ingredient *ingredient : ingredients) {
      Value &json_ingredient = json_ingredients.append(emptyObject);
      maybe_set(json_ingredient, "quantity", ingredient->Get_quantity());
      maybe_set(json_ingredient, "unit", ingredient->Get_measurement());
      maybe_set(json_ingredient, "name", ingredient->Get_ingredient());
      maybe_set(json_ingredient, "preparation", ingredient->Get_preparation());
    }

    const std::vector<CB_String> &direction_lines = recipe->Get_directions();
    std::string directions;
    for (const auto &direction : direction_lines) {
      directions += direction.str();
      directions += "\n";
    }
    recipeJson["recipeInstructions"] = directions;
  }
  Json::StyledStreamWriter("  ").write(std::cout, root);
};
