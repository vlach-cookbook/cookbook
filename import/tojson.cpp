#include "cb_database.h"

#include "json/json.h"
#include "time.h"
#include <random>
#include <regex>

using Json::Value;

// NOT THREAD SAFE
std::string next_push_id() {
  static const char alphabet[] = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
  static int64_t last_timestamp = 0;
  static char last_rand[12] = {};
  static std::random_device engine;
  static std::uniform_int_distribution<char> dist(0, 63);
  timespec time;
  assert(0 == clock_gettime(CLOCK_REALTIME, &time));
  int64_t current_timestamp = static_cast<int64_t>(time.tv_sec) * 1000
    + time.tv_nsec / 1000 / 1000;
  bool duplicate_timestamp = false;
  if (current_timestamp == last_timestamp) {
    duplicate_timestamp = true;
  } else {
    last_timestamp = current_timestamp;
  }
  if (duplicate_timestamp) {
    int i;
    for (i = 11; i >= 0 && last_rand[i] == 63; --i) {
      last_rand[i] = 0;
    }
    if (i >= 0)
      last_rand[i]++;
  } else {
    for (int i = 0; i < 12; ++i) {
      last_rand[i] = dist(engine);
    }
  }

  std::string result;
  result.resize(20);
  for (int i = 7; i >= 0; --i) {
    result[i] = alphabet[current_timestamp % 64];
    current_timestamp /= 64;
  }
  for (int i = 0; i < 12; ++i) {
    result[i + 8] = alphabet[last_rand[i]];
  }
  return result;
}

void maybe_set(Value& val, const char* key, const CB_String& s) {
  if (s.size() == 0) return;
  val[key] = s.str();
}
void maybe_append(Value& val, const CB_String& s) {
  if (s.size() == 0) return;
  val[next_push_id()] = s.str();
}

int main(int argc, char** argv) {
  if (argc < 2) {
    std::cout << "Pass the name of the recipe database to this program, usually 'Recipe.cbd'.\n";
    exit(0);
  }

  const Value emptyObject(Json::objectValue);

  CB_Book* book = new CB_Book;
  book->Read(argv[1]);
  Value root(Json::objectValue);
  const CB_RecipeMap_t& recipes = book->Get_sortedByName();
  Value& recipesMeta = root["recipesMeta"] = emptyObject;
  Value& recipesDetails = root["recipesDetails"] = emptyObject;
  Value& recipeUrls = root["recipeUrls"] = emptyObject;
  for (auto& elem : recipes) {
    CB_Recipe* const recipe = elem.second;
    const std::string recipeId = next_push_id();
    Value& recipeMeta = recipesMeta[recipeId] = emptyObject;
    Value& recipeDetails = recipesDetails[recipeId] = emptyObject;
    const std::string title = recipe->Get_name().str();
    recipeMeta["title"] = title;
    int serves = atoi(recipe->Get_serves().c_str());
    if (serves > 0)
      recipeDetails["serves"] = serves;
    tm date = {};
    if (3 == sscanf(recipe->Get_date().c_str(), "%d-%d-%d",
                    &date.tm_mon, &date.tm_mday, &date.tm_year)) {
      date.tm_mon--;  // 0-based.
      date.tm_year -= 1900;  // I <3 y2k.
      date.tm_isdst = -1;  // Unknown.
      Value::Int64 date_seconds = mktime(&date);  // Interprets date as local time.
      if (date_seconds > 0) {
        recipeDetails["date"] = date_seconds * 1000;
      }
    }

    Value categories = emptyObject;
    maybe_append(categories, recipe->Get_cat1());
    maybe_append(categories, recipe->Get_cat2());
    maybe_append(categories, recipe->Get_cat3());
    maybe_append(categories, recipe->Get_cat4());
    recipeDetails["categories"] = std::move(categories);

    const std::vector< CB_Ingredient* >& ingredients = recipe->Get_ingredients();
    Value& json_ingredients = recipeDetails["ingredients"] = emptyObject;
    for (CB_Ingredient* ingredient : ingredients) {
      Value& json_ingredient = json_ingredients[next_push_id()] = emptyObject;
      maybe_set(json_ingredient, "quantity", ingredient->Get_quantity());
      maybe_set(json_ingredient, "unit", ingredient->Get_measurement());
      maybe_set(json_ingredient, "name", ingredient->Get_ingredient());
      maybe_set(json_ingredient, "preparation", ingredient->Get_preparation());
    }

    const std::vector< CB_String >& direction_lines = recipe->Get_directions();
    std::string directions;
    for (const auto& direction : direction_lines) {
      directions += direction.str();
      directions += "\n";
    }
    recipeDetails["directions"] = directions;

    static const std::regex nonAlnum("[^a-z0-9]+");
    std::string lowerTitle = title;
    for (char& c : lowerTitle) {
      c = tolower(c);  // Existing db is ascii only.
    }
    const std::string recipeUrl = std::regex_replace(lowerTitle, nonAlnum, "-");
    if (recipeUrl.size() > 1) {
      recipeUrls[recipeUrl]["id"] = recipeId;
    }
  }
  Json::StyledStreamWriter("  ").write(std::cout, root);
};
