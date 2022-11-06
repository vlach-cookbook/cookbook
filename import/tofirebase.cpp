#include "cb_database.h"

#include "json/json.h"
#include "time.h"
#include "unicode/unistr.h"
#include <random>
#include <regex>

using Json::Value;

static const char hexDigits[] = "0123456789ABCDEF";

// NOT THREAD SAFE
std::string next_push_id() {
  static const char alphabet[] = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
  static int64_t last_timestamp = 0;
  static unsigned char last_rand[12] = {};
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

std::string lowerCase(const std::string& source) {
  icu::UnicodeString lower = icu::UnicodeString::fromUTF8(source);
  lower.toLower();
  std::string result;
  lower.toUTF8String(result);
  return result;
}

std::string titleCase(const std::string& source) {
  icu::UnicodeString title = icu::UnicodeString::fromUTF8(source);
  title.toTitle(nullptr);
  std::string result;
  title.toUTF8String(result);
  return result;
}

std::string urlFromTitle(const std::string& title) {
  static const std::regex nonAlnum("[^a-z0-9]+");
  std::string lowerTitle = lowerCase(title);
  return std::regex_replace(lowerTitle, nonAlnum, "-");
}

std::string escapeKey(const std::string& unescaped) {
  std::string result;
  for (unsigned char c : unescaped) {
    switch(c) {
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
    case '%':  // And the escape character.
      result += '%';
      result += hexDigits[c/16];
      result += hexDigits[c%16];
      break;
    }
  }
  return result;
}

int main(int argc, char** argv) {
  if (argc < 2) {
    std::cout << "Pass the name of the recipe database to this program, usually 'Recipe.cbd'.\n";
    exit(0);
  }

  const Value emptyObject(Json::objectValue);

  // Counts the number of times a url has been used.
  std::map<std::string, int> urlCounts;
  std::ostringstream titleStream;

  CB_Book* book = new CB_Book;
  book->Read(argv[1]);
  Value root(Json::objectValue);
  const CB_RecipeMap_t& recipes = book->Get_sortedByName();
  Value& recipesMeta = root["recipesMeta"] = emptyObject;
  Value& recipesDetails = root["recipesDetails"] = emptyObject;
  Value& recipeUrls = root["recipeUrls"] = emptyObject;
  Value& ingredientNames = root["ingredientNames"] = emptyObject;
  Value& ingredientRecipes = root["ingredientRecipes"] = emptyObject;

  for (auto& elem : recipes) {
    CB_Recipe* const recipe = elem.second;
    const std::string recipeId = next_push_id();
    Value& recipeMeta = recipesMeta[recipeId] = emptyObject;
    Value& recipeDetails = recipesDetails[recipeId] = emptyObject;
    std::string title = recipe->Get_name().str();
    std::string recipeUrl = urlFromTitle(title);
    if (++urlCounts[recipeUrl] > 1) {
      titleStream.str("");
      titleStream << title << " " << urlCounts[recipeUrl];
      title = titleStream.str();
      recipeUrl = urlFromTitle(title);
    }
    title = titleCase(title);
    recipeMeta["title"] = title;
    if (recipeUrl.size() > 1) {
      recipeUrls[recipeUrl]["id"] = recipeId;
    }

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

      if (ingredient->Get_ingredient().size() > 0) {
        Value& ingredientId = ingredientNames[escapeKey(ingredient->Get_ingredient().str())];
        if (!ingredientId) {
          ingredientId = next_push_id();
        }
        ingredientRecipes[ingredientId.asCString()][recipeId] = title;
      }
    }

    const std::vector< CB_String >& direction_lines = recipe->Get_directions();
    std::string directions;
    for (const auto& direction : direction_lines) {
      directions += direction.str();
      directions += "\n";
    }
    recipeDetails["directions"] = directions;
  }
  Json::StyledStreamWriter("  ").write(std::cout, root);
};
